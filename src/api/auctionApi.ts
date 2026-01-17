/**
 * API client for the auction backend.
 * 
 * Interview Note: This module encapsulates all HTTP concerns,
 * providing a clean interface for the rest of the app.
 * Using native fetch instead of axios to minimize dependencies.
 */

const API_BASE_URL = 'http://localhost:8080/api';

/**
 * Generic fetch wrapper with error handling.
 */
async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || `HTTP ${response.status}`);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return null as T;
  }

  return response.json();
}

// ============================================
// API Response Types (from backend DTOs)
// ============================================

export interface PlayerStatsDto {
  matches: number | null;
  battingAverage: number | null;
  bowlingAverage: number | null;
  strikeRate: number | null;
  economyRate: number | null;
}

export interface PlayerDto {
  id: number;
  name: string;
  role: 'BATTER' | 'BOWLER' | 'ALL_ROUNDER' | 'WICKET_KEEPER';
  nationality: 'DOMESTIC' | 'OVERSEAS';
  basePrice: number;
  stats: PlayerStatsDto;
}

export interface TeamDto {
  id: number;
  name: string;
  shortName: string;
  initialBudget: number;
  primaryColor: string;
}

export interface AcquiredPlayerDto {
  player: PlayerDto;
  soldPrice: number;
}

export interface TeamAuctionStateDto {
  team: TeamDto;
  remainingBudget: number;
  acquiredPlayers: AcquiredPlayerDto[];
}

export interface AuctionDto {
  id: number;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  startedAt: string;
  completedAt: string | null;
  teamStates: TeamAuctionStateDto[];
  soldPlayerIds: number[];
}

export interface BidResultDto {
  success: boolean;
  message: string;
  updatedTeamState: TeamAuctionStateDto | null;
}

// ============================================
// API Functions
// ============================================

/**
 * Fetch all players from the backend.
 */
export async function fetchPlayers(): Promise<PlayerDto[]> {
  return fetchApi<PlayerDto[]>('/players');
}

/**
 * Fetch all teams from the backend.
 */
export async function fetchTeams(): Promise<TeamDto[]> {
  return fetchApi<TeamDto[]>('/teams');
}

/**
 * Start a new auction.
 */
export async function startAuction(): Promise<AuctionDto> {
  return fetchApi<AuctionDto>('/auction/start', { method: 'POST' });
}

/**
 * Get auction by ID.
 */
export async function getAuction(auctionId: number): Promise<AuctionDto> {
  return fetchApi<AuctionDto>(`/auction/${auctionId}`);
}

/**
 * Get the currently active auction.
 * Returns null if no active auction.
 */
export async function getActiveAuction(): Promise<AuctionDto | null> {
  return fetchApi<AuctionDto | null>('/auction/active');
}

/**
 * Record a successful bid/sale.
 */
export async function recordBid(
  auctionId: number,
  playerId: number,
  teamId: number,
  price: number
): Promise<BidResultDto> {
  return fetchApi<BidResultDto>('/auction/bid', {
    method: 'POST',
    body: JSON.stringify({
      auctionId,
      playerId,
      teamId,
      price,
    }),
  });
}

/**
 * Mark a player as unsold.
 */
export async function markPlayerUnsold(
  auctionId: number,
  playerId: number
): Promise<void> {
  return fetchApi<void>(`/auction/${auctionId}/unsold/${playerId}`, {
    method: 'POST',
  });
}

/**
 * Complete an auction.
 */
export async function completeAuction(auctionId: number): Promise<AuctionDto> {
  return fetchApi<AuctionDto>(`/auction/${auctionId}/complete`, {
    method: 'POST',
  });
}
