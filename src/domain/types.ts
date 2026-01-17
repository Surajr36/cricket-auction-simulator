/**
 * Domain Types for Cricket Auction Simulator
 * 
 * ARCHITECTURE DECISION: Why domain types are in a separate file?
 * 
 * 1. SINGLE SOURCE OF TRUTH: All type definitions live here. When you need to
 *    understand the domain model, you look at one file.
 * 
 * 2. SEPARATION OF CONCERNS: Domain types should not depend on React. This allows:
 *    - Reusability in non-React contexts (Node.js scripts, tests, etc.)
 *    - Cleaner imports without circular dependencies
 *    - Easier testing of domain logic in isolation
 * 
 * 3. INTERVIEW DEFENSE: You can explain the entire domain model without touching React.
 *    This demonstrates you think in terms of the problem domain, not just UI components.
 * 
 * ALTERNATIVES CONSIDERED:
 * - Co-locating types with components: Rejected because it scatters domain knowledge
 * - Using a single types.ts at root: Acceptable for tiny projects, but doesn't scale
 * - Using interfaces everywhere: We prefer `type` for unions and intersections
 * 
 * COMMON MISTAKE: Using `any` or weak types. This project uses strict TypeScript
 * to catch bugs at compile time that would otherwise slip into production.
 */

// ============================================================================
// PLAYER DOMAIN
// ============================================================================

/**
 * Player roles in T20 cricket.
 * 
 * WHY A UNION TYPE instead of enum?
 * - Unions are more type-safe with discriminated unions
 * - Better tree-shaking (enums generate runtime code)
 * - More idiomatic in modern TypeScript
 * - Easier to use with array methods like .includes()
 * 
 * INTERVIEW TIP: Enums have quirks (reverse mappings, numeric enums) that
 * can cause subtle bugs. String unions are simpler and safer.
 */
export type PlayerRole = 'batter' | 'bowler' | 'all-rounder' | 'wicket-keeper';

/**
 * Player nationality - affects overseas player limits.
 */
export type PlayerNationality = 'domestic' | 'overseas';

/**
 * Base player data as loaded from JSON/API.
 * This represents the IMMUTABLE player information.
 */
export type Player = {
  readonly id: string;
  readonly name: string;
  readonly role: PlayerRole;
  readonly nationality: PlayerNationality;
  readonly basePrice: number; // in lakhs (₹100,000 units)
  readonly stats: PlayerStats;
};

/**
 * Player performance statistics.
 * These inform AI recommendations.
 */
export type PlayerStats = {
  readonly matches: number;
  readonly battingAverage: number | null; // null for pure bowlers
  readonly bowlingAverage: number | null; // null for pure batters
  readonly strikeRate: number | null;
  readonly economyRate: number | null;
};

// ============================================================================
// TEAM DOMAIN
// ============================================================================

/**
 * Team configuration loaded at startup.
 * Represents static team information.
 */
export type Team = {
  readonly id: string;
  readonly name: string;
  readonly shortName: string;
  readonly budget: number; // in lakhs
  readonly primaryColor: string;
};

/**
 * Team's current state during auction.
 * This is the MUTABLE team state that changes with each purchase.
 * 
 * WHY SEPARATE from Team?
 * - Clean separation between static config and runtime state
 * - Makes state updates explicit and trackable
 * - Easier to reset/reload teams without losing state shape
 */
export type TeamState = {
  readonly teamId: string;
  readonly remainingBudget: number;
  readonly squad: ReadonlyArray<AcquiredPlayer>;
};

/**
 * A player that has been purchased by a team.
 * We store the purchase price separately from base price.
 */
export type AcquiredPlayer = {
  readonly playerId: string;
  readonly purchasePrice: number;
};

// ============================================================================
// SQUAD CONSTRAINTS
// ============================================================================

/**
 * Squad composition rules enforced by validators.
 * 
 * WHY A SEPARATE TYPE?
 * - Rules can be loaded from config, making the app configurable
 * - Easy to test validators with different rule sets
 * - Clearly documents what constraints exist
 */
export type SquadConstraints = {
  readonly minSquadSize: number;
  readonly maxSquadSize: number;
  readonly maxOverseasPlayers: number;
  readonly roleConstraints: RoleConstraints;
};

/**
 * Minimum and maximum players per role.
 */
export type RoleConstraints = {
  readonly [K in PlayerRole]: {
    readonly min: number;
    readonly max: number;
  };
};

// ============================================================================
// AUCTION STATE (Discriminated Union)
// ============================================================================

/**
 * The auction phases, modeled as a state machine.
 * 
 * WHY A DISCRIMINATED UNION?
 * This is a classic interview topic. Discriminated unions:
 * 1. Make illegal states unrepresentable
 * 2. Enable exhaustive switch statements
 * 3. Provide type narrowing in conditionals
 * 
 * COMMON MISTAKE: Using a single object with optional fields.
 * That approach allows invalid combinations like having a currentBid
 * without a currentPlayer, which should be impossible.
 * 
 * EXAMPLE OF BUG PREVENTION:
 * If status is 'idle', there's NO currentPlayer field. You literally
 * cannot access state.currentPlayer without TypeScript complaining.
 */

export type AuctionPhase = 
  | 'idle'           // No auction in progress
  | 'bidding'        // Active bidding on a player
  | 'sold'           // Player just sold, awaiting next
  | 'unsold'         // Player passed, awaiting next
  | 'completed';     // Auction finished

/**
 * Idle state - auction hasn't started or between players.
 */
export type IdleAuctionState = {
  readonly phase: 'idle';
  readonly completedPlayerIds: ReadonlyArray<string>;
  readonly teams: ReadonlyArray<TeamState>;
  readonly message: string | null;
};

/**
 * Active bidding state.
 */
export type BiddingAuctionState = {
  readonly phase: 'bidding';
  readonly currentPlayer: Player;
  readonly currentBid: CurrentBid | null; // null if no bids yet
  readonly timeRemaining: number; // seconds
  readonly completedPlayerIds: ReadonlyArray<string>;
  readonly teams: ReadonlyArray<TeamState>;
  readonly message: string | null;
};

/**
 * Player just sold state (transitional).
 */
export type SoldAuctionState = {
  readonly phase: 'sold';
  readonly soldPlayer: Player;
  readonly winningBid: CurrentBid;
  readonly completedPlayerIds: ReadonlyArray<string>;
  readonly teams: ReadonlyArray<TeamState>;
  readonly message: string | null;
};

/**
 * Player unsold state (transitional).
 */
export type UnsoldAuctionState = {
  readonly phase: 'unsold';
  readonly unsoldPlayer: Player;
  readonly completedPlayerIds: ReadonlyArray<string>;
  readonly teams: ReadonlyArray<TeamState>;
  readonly message: string | null;
};

/**
 * Auction completed state.
 */
export type CompletedAuctionState = {
  readonly phase: 'completed';
  readonly completedPlayerIds: ReadonlyArray<string>;
  readonly teams: ReadonlyArray<TeamState>;
  readonly message: string | null;
};

/**
 * The main auction state type - a discriminated union.
 * 
 * USAGE: Always check `state.phase` first, then TypeScript knows
 * exactly which fields are available.
 */
export type AuctionState = 
  | IdleAuctionState 
  | BiddingAuctionState 
  | SoldAuctionState 
  | UnsoldAuctionState
  | CompletedAuctionState;

/**
 * Current bid information during active bidding.
 */
export type CurrentBid = {
  readonly teamId: string;
  readonly amount: number;
};

// ============================================================================
// AUCTION ACTIONS (Discriminated Union)
// ============================================================================

/**
 * All possible auction actions.
 * 
 * WHY DISCRIMINATED UNIONS FOR ACTIONS?
 * - Exhaustive handling in reducer (TypeScript enforces you handle all cases)
 * - Self-documenting: you can see all possible state transitions
 * - Payload is type-safe per action type
 * 
 * COMMON MISTAKE: Using a generic { type: string, payload: any }
 * That throws away all type safety benefits.
 */

export type StartBiddingAction = {
  readonly type: 'START_BIDDING';
  readonly payload: {
    readonly player: Player;
  };
};

export type PlaceBidAction = {
  readonly type: 'PLACE_BID';
  readonly payload: {
    readonly teamId: string;
    readonly amount: number;
  };
};

export type InvalidBidAction = {
  readonly type: 'INVALID_BID';
  readonly payload: {
    readonly reason: string;
  };
};

export type TimeExpiredAction = {
  readonly type: 'TIME_EXPIRED';
};

export type PlayerSoldAction = {
  readonly type: 'PLAYER_SOLD';
};

export type PlayerUnsoldAction = {
  readonly type: 'PLAYER_UNSOLD';
};

export type ResetToIdleAction = {
  readonly type: 'RESET_TO_IDLE';
};

export type TimerTickAction = {
  readonly type: 'TIMER_TICK';
};

export type AuctionAction = 
  | StartBiddingAction
  | PlaceBidAction
  | InvalidBidAction
  | TimeExpiredAction
  | PlayerSoldAction
  | PlayerUnsoldAction
  | ResetToIdleAction
  | TimerTickAction;

// ============================================================================
// VALIDATION TYPES
// ============================================================================

/**
 * Result of a validation check.
 * 
 * WHY NOT THROW ERRORS?
 * - Errors are for exceptional cases, not business rule violations
 * - Returning a result allows accumulating multiple errors
 * - Easier to display user-friendly messages
 * - More functional, easier to test
 */
export type ValidationResult = 
  | { readonly isValid: true }
  | { readonly isValid: false; readonly errors: ReadonlyArray<ValidationError> };

export type ValidationError = {
  readonly code: ValidationErrorCode;
  readonly message: string;
  readonly context?: Record<string, unknown>;
};

export type ValidationErrorCode = 
  | 'INSUFFICIENT_BUDGET'
  | 'SQUAD_FULL'
  | 'ROLE_LIMIT_EXCEEDED'
  | 'OVERSEAS_LIMIT_EXCEEDED'
  | 'BID_TOO_LOW'
  | 'NOT_YOUR_TURN'
  | 'AUCTION_NOT_ACTIVE';

// ============================================================================
// AI RECOMMENDATION TYPES
// ============================================================================

/**
 * AI recommendation for a bid.
 * 
 * WHY EXPLAINABLE?
 * - Users trust recommendations they understand
 * - Debugging is easier when you see the reasoning
 * - Demonstrates you understand AI isn't magic
 */
export type BidRecommendation = {
  readonly recommendedMaxBid: number;
  readonly confidence: 'low' | 'medium' | 'high';
  readonly reasoning: ReadonlyArray<ReasoningFactor>;
};

export type ReasoningFactor = {
  readonly factor: string;
  readonly impact: 'positive' | 'negative' | 'neutral';
  readonly explanation: string;
};

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Extract team state for a specific team.
 * Demonstrates utility type usage.
 */
export type TeamStateById = (teamId: string, teams: ReadonlyArray<TeamState>) => TeamState | undefined;

/**
 * Player with computed fields for display.
 */
export type PlayerWithStatus = Player & {
  readonly status: 'available' | 'sold' | 'unsold';
  readonly soldTo?: string;
  readonly soldPrice?: number;
};

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Default squad constraints following IPL-style rules.
 */
export const DEFAULT_SQUAD_CONSTRAINTS: SquadConstraints = {
  minSquadSize: 15,
  maxSquadSize: 25,
  maxOverseasPlayers: 8,
  roleConstraints: {
    'batter': { min: 3, max: 8 },
    'bowler': { min: 3, max: 8 },
    'all-rounder': { min: 2, max: 6 },
    'wicket-keeper': { min: 1, max: 3 },
  },
} as const;

/**
 * Auction timing constants.
 */
export const AUCTION_CONSTANTS = {
  INITIAL_BID_TIME: 60, // seconds
  BID_INCREMENT_MIN: 5, // lakhs
  TIME_EXTENSION_ON_BID: 15, // seconds added when bid is placed
  MAX_TIME_EXTENSION: 60, // cap on time remaining
} as const;
