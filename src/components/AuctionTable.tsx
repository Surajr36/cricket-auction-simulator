/**
 * AuctionTable - Displays the list of players available for auction.
 * 
 * COMPONENT PURPOSE:
 * - Show all players in a table/grid format
 * - Indicate player status (available, sold, unsold)
 * - Allow selecting a player to start bidding
 * - Filter/sort capabilities
 * 
 * PERFORMANCE CONSIDERATIONS:
 * - May display 50+ players
 * - Uses virtualization pattern (simplified)
 * - Memoizes individual PlayerCard components
 */

import React, { useMemo, useState, useCallback } from 'react';
import { Player, PlayerRole, PlayerNationality } from '../domain/types';
import { PlayerCard } from './PlayerCard';

type PlayerStatus = 'available' | 'sold' | 'unsold';

type PlayerWithStatus = Player & {
  status: PlayerStatus;
  soldTo?: string;
  soldPrice?: number;
};

type AuctionTableProps = {
  players: ReadonlyArray<Player>;
  completedPlayerIds: ReadonlyArray<string>;
  soldPlayerInfo: ReadonlyArray<{ playerId: string; teamId: string; price: number }>;
  currentPlayerId: string | null;
  onSelectPlayer: (player: Player) => void;
};

/**
 * Filter configuration.
 */
type FilterConfig = {
  role: PlayerRole | 'all';
  nationality: PlayerNationality | 'all';
  status: PlayerStatus | 'all';
  searchQuery: string;
};

/**
 * AuctionTable Component
 * 
 * INTERVIEW TALKING POINTS:
 * 1. Derived state with useMemo for filtered/sorted players
 * 2. Correct key usage in lists (player.id, not index)
 * 3. Callback memoization for event handlers
 * 4. Filter state management (local, not in reducer)
 */
export function AuctionTable({
  players,
  completedPlayerIds,
  soldPlayerInfo,
  currentPlayerId,
  onSelectPlayer,
}: AuctionTableProps): React.ReactElement {
  /**
   * Local filter state.
   * 
   * WHY LOCAL STATE?
   * - Filters are UI-specific, not domain state
   * - Don't need to persist or share
   * - Keeps reducer focused on auction logic
   */
  const [filters, setFilters] = useState<FilterConfig>({
    role: 'all',
    nationality: 'all',
    status: 'all',
    searchQuery: '',
  });

  /**
   * Enrich players with status information.
   * 
   * useMemo IS CRITICAL here:
   * - Iterates over all players
   * - Creates new objects
   * - Only recomputes when dependencies change
   */
  const playersWithStatus = useMemo<PlayerWithStatus[]>(() => {
    const soldInfoMap = new Map(
      soldPlayerInfo.map(info => [info.playerId, info])
    );

    return players.map(player => {
      const soldInfo = soldInfoMap.get(player.id);
      const isCompleted = completedPlayerIds.includes(player.id);

      if (soldInfo) {
        return {
          ...player,
          status: 'sold' as const,
          soldTo: soldInfo.teamId,
          soldPrice: soldInfo.price,
        };
      } else if (isCompleted) {
        return {
          ...player,
          status: 'unsold' as const,
        };
      } else {
        return {
          ...player,
          status: 'available' as const,
        };
      }
    });
  }, [players, completedPlayerIds, soldPlayerInfo]);

  /**
   * Apply filters to players.
   * 
   * IMPORTANT: Filter after enrichment to have status available.
   */
  const filteredPlayers = useMemo(() => {
    return playersWithStatus.filter(player => {
      // Role filter
      if (filters.role !== 'all' && player.role !== filters.role) {
        return false;
      }

      // Nationality filter
      if (filters.nationality !== 'all' && player.nationality !== filters.nationality) {
        return false;
      }

      // Status filter
      if (filters.status !== 'all' && player.status !== filters.status) {
        return false;
      }

      // Search query
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        return player.name.toLowerCase().includes(query);
      }

      return true;
    });
  }, [playersWithStatus, filters]);

  /**
   * Statistics for display.
   */
  const stats = useMemo(() => ({
    total: players.length,
    available: playersWithStatus.filter(p => p.status === 'available').length,
    sold: playersWithStatus.filter(p => p.status === 'sold').length,
    unsold: playersWithStatus.filter(p => p.status === 'unsold').length,
  }), [players.length, playersWithStatus]);

  /**
   * Filter change handlers.
   */
  const handleRoleFilter = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters(prev => ({ ...prev, role: e.target.value as FilterConfig['role'] }));
  }, []);

  const handleNationalityFilter = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters(prev => ({ ...prev, nationality: e.target.value as FilterConfig['nationality'] }));
  }, []);

  const handleStatusFilter = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters(prev => ({ ...prev, status: e.target.value as FilterConfig['status'] }));
  }, []);

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, searchQuery: e.target.value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      role: 'all',
      nationality: 'all',
      status: 'all',
      searchQuery: '',
    });
  }, []);

  // Styles
  const containerStyle: React.CSSProperties = {
    padding: '16px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    backgroundColor: '#fff',
  };

  const filterBarStyle: React.CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    marginBottom: '16px',
    padding: '12px',
    backgroundColor: '#f8f9fa',
    borderRadius: '4px',
  };

  const selectStyle: React.CSSProperties = {
    padding: '6px 12px',
    borderRadius: '4px',
    border: '1px solid #ddd',
    backgroundColor: '#fff',
  };

  const inputStyle: React.CSSProperties = {
    ...selectStyle,
    minWidth: '200px',
  };

  const statsBarStyle: React.CSSProperties = {
    display: 'flex',
    gap: '16px',
    marginBottom: '16px',
    fontSize: '14px',
    color: '#666',
  };

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '8px',
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <h2 style={{ marginTop: 0 }}>🏏 Player Pool</h2>

      {/* Stats Bar */}
      <div style={statsBarStyle}>
        <span>Total: {stats.total}</span>
        <span style={{ color: '#28a745' }}>Available: {stats.available}</span>
        <span style={{ color: '#dc3545' }}>Sold: {stats.sold}</span>
        <span style={{ color: '#6c757d' }}>Unsold: {stats.unsold}</span>
      </div>

      {/* Filter Bar */}
      <div style={filterBarStyle}>
        <div>
          <label htmlFor="search-filter" style={{ marginRight: '8px' }}>
            Search:
          </label>
          <input
            id="search-filter"
            type="text"
            placeholder="Player name..."
            value={filters.searchQuery}
            onChange={handleSearch}
            style={inputStyle}
          />
        </div>

        <div>
          <label htmlFor="role-filter" style={{ marginRight: '8px' }}>
            Role:
          </label>
          <select
            id="role-filter"
            value={filters.role}
            onChange={handleRoleFilter}
            style={selectStyle}
          >
            <option value="all">All Roles</option>
            <option value="batter">Batters</option>
            <option value="bowler">Bowlers</option>
            <option value="all-rounder">All-rounders</option>
            <option value="wicket-keeper">Wicket-keepers</option>
          </select>
        </div>

        <div>
          <label htmlFor="nationality-filter" style={{ marginRight: '8px' }}>
            Nationality:
          </label>
          <select
            id="nationality-filter"
            value={filters.nationality}
            onChange={handleNationalityFilter}
            style={selectStyle}
          >
            <option value="all">All</option>
            <option value="domestic">Domestic</option>
            <option value="overseas">Overseas</option>
          </select>
        </div>

        <div>
          <label htmlFor="status-filter" style={{ marginRight: '8px' }}>
            Status:
          </label>
          <select
            id="status-filter"
            value={filters.status}
            onChange={handleStatusFilter}
            style={selectStyle}
          >
            <option value="all">All</option>
            <option value="available">Available</option>
            <option value="sold">Sold</option>
            <option value="unsold">Unsold</option>
          </select>
        </div>

        <button
          onClick={clearFilters}
          style={{
            padding: '6px 12px',
            borderRadius: '4px',
            border: '1px solid #6c757d',
            backgroundColor: '#fff',
            cursor: 'pointer',
          }}
        >
          Clear Filters
        </button>
      </div>

      {/* Results Info */}
      <p style={{ color: '#666', marginBottom: '12px' }}>
        Showing {filteredPlayers.length} of {players.length} players
      </p>

      {/* Player Grid */}
      <div style={gridStyle}>
        {filteredPlayers.map(player => (
          /**
           * KEY USAGE:
           * 
           * CRITICAL: Using player.id as key, NOT array index.
           * 
           * WHY?
           * - Index-based keys cause bugs when list is filtered/sorted
           * - React uses keys to track component identity
           * - With wrong keys, state can be associated with wrong components
           * 
           * COMMON MISTAKE:
           * {players.map((p, i) => <Card key={i} ... />)}
           * This breaks when players array order changes.
           */
          <PlayerCard
            key={player.id}
            player={player}
            isSelected={player.id === currentPlayerId}
            isSold={player.status === 'sold'}
            {...(player.soldTo && { soldTo: player.soldTo })}
            {...(player.soldPrice && { soldPrice: player.soldPrice })}
            {...(player.status === 'available' && { onClick: onSelectPlayer })}
          />
        ))}
      </div>

      {/* Empty State */}
      {filteredPlayers.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '32px',
          color: '#666',
        }}>
          <p>No players match your filters.</p>
          <button
            onClick={clearFilters}
            style={{
              padding: '8px 16px',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: '#007bff',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * NOTE: AuctionTable itself is NOT memoized.
 * 
 * WHY?
 * - It receives large arrays that change frequently
 * - Child PlayerCards are already memoized
 * - Memo comparison cost would be high (array comparison)
 * 
 * The optimization is at the child level, not here.
 */
