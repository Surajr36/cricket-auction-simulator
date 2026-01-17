/**
 * Auction Rules - Business logic for auction operations.
 * 
 * ARCHITECTURE DECISION: Why separate auction rules from validation?
 * 
 * 1. DIFFERENT RESPONSIBILITIES:
 *    - Validation: "Is this action allowed?" (returns true/false + reasons)
 *    - Rules: "What should happen next?" (returns new state or computed values)
 * 
 * 2. COMPOSITION: Rules use validators internally but add business logic on top.
 * 
 * 3. INTERVIEW DEFENSE: Shows you understand the difference between:
 *    - Guard clauses (validation)
 *    - Business logic (rules)
 *    - State transitions (reducer)
 * 
 * COMMON MISTAKE: Putting all business logic in the reducer.
 * That makes reducers huge and hard to test. Extract to domain functions.
 */

import {
  AuctionState,
  BiddingAuctionState,
  CurrentBid,
  Player,
  TeamState,
  ValidationResult,
  AUCTION_CONSTANTS,
} from './types';
import { validateBudget, validatePlayerAcquisition } from './squadValidator';

// ============================================================================
// BID VALIDATION
// ============================================================================

/**
 * Validates if a bid amount is valid for the current auction state.
 * 
 * This checks:
 * 1. Bid is higher than current bid (if any)
 * 2. Bid meets minimum increment
 * 3. Team can afford it
 * 4. Team can accommodate the player
 * 
 * WHY RETURN ValidationResult instead of boolean?
 * - Caller can show specific error messages
 * - Multiple errors can be collected
 * - Consistent API across all validation functions
 */
export function validateBid(
  state: BiddingAuctionState,
  teamId: string,
  bidAmount: number,
  allPlayers: ReadonlyArray<Player>
): ValidationResult {
  const teamState = state.teams.find(t => t.teamId === teamId);
  
  if (!teamState) {
    return {
      isValid: false,
      errors: [{
        code: 'NOT_YOUR_TURN',
        message: 'Team not found in auction.',
        context: { teamId },
      }],
    };
  }

  // Check bid amount validity
  const minValidBid = getMinimumValidBid(state);
  if (bidAmount < minValidBid) {
    return {
      isValid: false,
      errors: [{
        code: 'BID_TOO_LOW',
        message: `Bid must be at least ₹${minValidBid}L. Minimum increment is ₹${AUCTION_CONSTANTS.BID_INCREMENT_MIN}L.`,
        context: {
          bidAmount,
          minimumRequired: minValidBid,
          increment: AUCTION_CONSTANTS.BID_INCREMENT_MIN,
        },
      }],
    };
  }

  // Check if team can afford and accommodate the player
  return validatePlayerAcquisition(
    teamState,
    state.currentPlayer,
    bidAmount,
    allPlayers
  );
}

/**
 * Gets the minimum valid bid for current state.
 * 
 * If no bids yet: base price
 * If bids exist: current bid + minimum increment
 */
export function getMinimumValidBid(state: BiddingAuctionState): number {
  if (state.currentBid === null) {
    return state.currentPlayer.basePrice;
  }
  return state.currentBid.amount + AUCTION_CONSTANTS.BID_INCREMENT_MIN;
}

/**
 * Gets suggested bid increments for UI buttons.
 * 
 * WHY RETURN AN ARRAY?
 * - UI can show multiple bid options (e.g., +5, +10, +20)
 * - Easy to customize increments based on current bid amount
 * 
 * COMMON PATTERN: Higher bids often have larger increments.
 * We scale increments based on current amount.
 */
export function getSuggestedBidIncrements(currentAmount: number): number[] {
  // Scale increments based on current bid
  if (currentAmount < 100) {
    return [5, 10, 20];
  } else if (currentAmount < 500) {
    return [10, 25, 50];
  } else if (currentAmount < 1000) {
    return [25, 50, 100];
  } else {
    return [50, 100, 200];
  }
}

// ============================================================================
// STATE TRANSITIONS
// ============================================================================

/**
 * Calculates new time remaining after a valid bid.
 * 
 * TIME EXTENSION LOGIC:
 * - Add time on each bid to allow counter-bids
 * - Cap at maximum to prevent infinite extensions
 * 
 * WHY A PURE FUNCTION?
 * - Easy to test
 * - Easy to change the logic
 * - No hidden state or side effects
 */
export function calculateTimeAfterBid(currentTime: number): number {
  const extended = currentTime + AUCTION_CONSTANTS.TIME_EXTENSION_ON_BID;
  return Math.min(extended, AUCTION_CONSTANTS.MAX_TIME_EXTENSION);
}

/**
 * Applies a bid to team state, returning new team state.
 * 
 * NOTE: This doesn't actually finalize the purchase - it's just used
 * to track the current highest bidder. Final purchase happens on PLAYER_SOLD.
 */
export function createBidUpdate(
  teamId: string,
  amount: number
): CurrentBid {
  return {
    teamId,
    amount,
  };
}

/**
 * Finalizes player purchase, updating team state.
 * 
 * WHY RETURN NEW STATE instead of mutating?
 * - Immutability prevents bugs in React (reference equality checks)
 * - Makes time-travel debugging possible
 * - Easier to reason about - no hidden mutations
 * 
 * COMMON MISTAKE: Mutating state directly
 * ```ts
 * // BAD - mutates original
 * teamState.remainingBudget -= price;
 * teamState.squad.push(player);
 * 
 * // GOOD - returns new object
 * return { ...teamState, remainingBudget: teamState.remainingBudget - price }
 * ```
 */
export function finalizePlayerPurchase(
  teamState: TeamState,
  playerId: string,
  purchasePrice: number
): TeamState {
  return {
    ...teamState,
    remainingBudget: teamState.remainingBudget - purchasePrice,
    squad: [
      ...teamState.squad,
      { playerId, purchasePrice },
    ],
  };
}

/**
 * Updates all teams after a player is sold.
 * Only the winning team's state changes.
 * 
 * WHY MAP ALL TEAMS even if only one changes?
 * - Consistent pattern that's easy to understand
 * - Performance is negligible for 8-10 teams
 * - Avoids index-based mutations which are error-prone
 */
export function updateTeamsAfterSale(
  teams: ReadonlyArray<TeamState>,
  winningTeamId: string,
  playerId: string,
  purchasePrice: number
): TeamState[] {
  return teams.map(team => {
    if (team.teamId === winningTeamId) {
      return finalizePlayerPurchase(team, playerId, purchasePrice);
    }
    return team;
  });
}

// ============================================================================
// QUERY FUNCTIONS
// ============================================================================

/**
 * Gets team state by ID.
 * 
 * WHY RETURN undefined instead of throwing?
 * - Caller can decide how to handle missing team
 * - More composable - can use with ?? or ?. operators
 * - Throwing is for exceptional cases, not data queries
 */
export function getTeamState(
  teams: ReadonlyArray<TeamState>,
  teamId: string
): TeamState | undefined {
  return teams.find(t => t.teamId === teamId);
}

/**
 * Checks if team can still participate in bidding.
 * A team can't bid if:
 * - Squad is full
 * - Budget is below minimum bid
 */
export function canTeamBid(
  teamState: TeamState,
  minBidAmount: number,
  player: Player,
  allPlayers: ReadonlyArray<Player>
): boolean {
  // Quick budget check
  const budgetResult = validateBudget(teamState, minBidAmount);
  if (!budgetResult.isValid) {
    return false;
  }

  // Full validation check
  const fullResult = validatePlayerAcquisition(
    teamState,
    player,
    minBidAmount,
    allPlayers
  );
  
  return fullResult.isValid;
}

/**
 * Gets list of teams that can still bid on current player.
 * Useful for UI to show/disable bid buttons.
 */
export function getEligibleBidders(
  state: BiddingAuctionState,
  allPlayers: ReadonlyArray<Player>
): string[] {
  const minBid = getMinimumValidBid(state);
  
  return state.teams
    .filter(team => canTeamBid(team, minBid, state.currentPlayer, allPlayers))
    .map(team => team.teamId);
}

/**
 * Checks if auction can continue.
 * Returns false if no players left or all teams have full squads.
 */
export function canAuctionContinue(
  state: AuctionState,
  remainingPlayerIds: ReadonlyArray<string>
): boolean {
  if (remainingPlayerIds.length === 0) {
    return false;
  }

  // Check if at least one team can still buy players
  const hasCapableTeam = state.teams.some(team => 
    team.remainingBudget > 0 && team.squad.length < 25
  );

  return hasCapableTeam;
}
