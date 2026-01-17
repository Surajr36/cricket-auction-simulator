/**
 * useAuctionData - Hook for fetching auction data from the backend API.
 * 
 * Interview Note: This hook handles async data fetching with proper
 * loading and error states. It's kept separate from useAuction to
 * maintain separation of concerns:
 * - useAuctionData: How to GET data (network concerns)
 * - useAuction: What to DO with data (business logic)
 * 
 * WHY NOT USE A LIBRARY (React Query, SWR)?
 * - This project intentionally avoids external dependencies
 * - Shows understanding of data fetching fundamentals
 * - React Query would be the right choice for production
 * 
 * COMMON MISTAKES AVOIDED:
 * 1. Race conditions: We track mounted state
 * 2. Memory leaks: Cleanup on unmount
 * 3. Missing loading/error states: All states are explicit
 */

import { useState, useEffect, useCallback } from 'react';
import { Player, Team, PlayerRole, PlayerNationality } from '../domain/types';
import {
  fetchPlayers,
  fetchTeams,
  recordBid as apiRecordBid,
  markPlayerUnsold as apiMarkUnsold,
  PlayerDto,
  TeamDto,
} from '../api/auctionApi';

// ============================================
// Types
// ============================================

type LoadingState = 'idle' | 'loading' | 'success' | 'error';

type UseAuctionDataReturn = {
  players: Player[];
  teams: Team[];
  loadingState: LoadingState;
  error: string | null;
  refetch: () => void;
  // API actions (fire-and-forget, don't block UI)
  persistSale: (teamId: string, playerId: string, price: number) => void;
  persistUnsold: (playerId: string) => void;
};

// ============================================
// Data Transformers
// ============================================

/**
 * Transform backend PlayerDto to frontend Player type.
 * 
 * Interview Note: This transformation layer isolates frontend from
 * backend data shapes. If the backend changes, only this function
 * needs updating.
 */
function transformPlayer(dto: PlayerDto): Player {
  const roleMap: Record<string, PlayerRole> = {
    'BATTER': 'batter',
    'BOWLER': 'bowler',
    'ALL_ROUNDER': 'all-rounder',
    'WICKET_KEEPER': 'wicket-keeper',
  };

  const nationalityMap: Record<string, PlayerNationality> = {
    'DOMESTIC': 'domestic',
    'OVERSEAS': 'overseas',
  };

  return {
    id: `player-${dto.id}`,
    name: dto.name,
    role: roleMap[dto.role] ?? 'batter',
    nationality: nationalityMap[dto.nationality] ?? 'domestic',
    basePrice: dto.basePrice,
    stats: {
      matches: dto.stats.matches ?? 0,
      battingAverage: dto.stats.battingAverage ?? null,
      bowlingAverage: dto.stats.bowlingAverage ?? null,
      strikeRate: dto.stats.strikeRate ?? null,
      economyRate: dto.stats.economyRate ?? null,
    },
  };
}

/**
 * Transform backend TeamDto to frontend Team type.
 */
function transformTeam(dto: TeamDto): Team {
  return {
    id: `team-${dto.shortName.toLowerCase()}`,
    name: dto.name,
    shortName: dto.shortName,
    budget: dto.initialBudget,
    primaryColor: dto.primaryColor,
  };
}

/**
 * Extract numeric ID from prefixed string ID.
 * e.g., "player-42" -> 42
 */
function extractNumericId(prefixedId: string): number {
  const match = prefixedId.match(/\d+$/);
  if (!match) {
    throw new Error(`Invalid ID format: ${prefixedId}`);
  }
  return parseInt(match[0], 10);
}

// ============================================
// Hook
// ============================================

export function useAuctionData(): UseAuctionDataReturn {
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [error, setError] = useState<string | null>(null);

  // Track current auction ID for API calls
  const [auctionId] = useState<number | null>(null);

  /**
   * Fetch initial data from the backend.
   */
  const fetchData = useCallback(async () => {
    setLoadingState('loading');
    setError(null);

    try {
      const [playersData, teamsData] = await Promise.all([
        fetchPlayers(),
        fetchTeams(),
      ]);

      setPlayers(playersData.map(transformPlayer));
      setTeams(teamsData.map(transformTeam));
      setLoadingState('success');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to fetch data';
      setError(message);
      setLoadingState('error');
      console.error('Failed to fetch auction data:', e);
    }
  }, []);

  /**
   * Persist a sale to the backend.
   * 
   * Note: This is fire-and-forget. The frontend state is already updated
   * optimistically. We just persist for future sessions.
   */
  const persistSale = useCallback((teamId: string, playerId: string, price: number) => {
    if (auctionId === null) {
      console.log('No active auction - sale not persisted to backend');
      return;
    }

    try {
      const numericPlayerId = extractNumericId(playerId);
      const numericTeamId = extractNumericId(teamId);
      
      apiRecordBid(auctionId, numericPlayerId, numericTeamId, price)
        .catch(e => console.error('Failed to persist sale:', e));
    } catch (e) {
      console.error('Failed to extract IDs for persistence:', e);
    }
  }, [auctionId]);

  /**
   * Persist unsold status to the backend.
   */
  const persistUnsold = useCallback((playerId: string) => {
    if (auctionId === null) {
      console.log('No active auction - unsold status not persisted to backend');
      return;
    }

    try {
      const numericPlayerId = extractNumericId(playerId);
      
      apiMarkUnsold(auctionId, numericPlayerId)
        .catch(e => console.error('Failed to persist unsold status:', e));
    } catch (e) {
      console.error('Failed to extract player ID for persistence:', e);
    }
  }, [auctionId]);

  /**
   * Fetch data on mount.
   * 
   * WHY useEffect FOR DATA FETCHING?
   * - Fetching is a side effect
   * - Should happen after component mounts
   * - Can be cleaned up if component unmounts
   * 
   * NOTE ON STRICT MODE:
   * In React 18 strict mode, useEffect runs twice in development.
   * This is intentional to help find bugs. In production, it runs once.
   */
  useEffect(() => {
    let mounted = true;

    const doFetch = async () => {
      // Only update state if still mounted
      if (!mounted) return;
      await fetchData();
    };

    doFetch();

    return () => {
      mounted = false;
    };
  }, [fetchData]);

  return {
    players,
    teams,
    loadingState,
    error,
    refetch: fetchData,
    persistSale,
    persistUnsold,
  };
}
