/**
 * useAuction - Core auction state management hook.
 * 
 * ARCHITECTURE DECISION: Why useReducer instead of useState?
 * 
 * 1. COMPLEX STATE TRANSITIONS:
 *    - Multiple pieces of state that change together
 *    - State transitions depend on current state
 *    - Actions are discrete and nameable
 * 
 * 2. TESTABILITY:
 *    - Reducer is a pure function: reducer(state, action) => newState
 *    - Can be tested without React, without hooks, without DOM
 *    - Every state transition is explicit and documented
 * 
 * 3. DEBUGGING:
 *    - Every state change has a named action
 *    - Can log actions for debugging
 *    - Redux DevTools compatible (with small wrapper)
 * 
 * 4. INTERVIEW DEFENSE:
 *    - Shows you understand when useState isn't enough
 *    - Demonstrates state machine thinking
 *    - Proves you can manage complex state without Redux
 * 
 * ALTERNATIVES CONSIDERED:
 * - useState: Too many interdependent pieces, hard to keep consistent
 * - Context + useState: Context would cause re-render storms
 * - Redux: Overkill for single-page app, adds dependency
 * - Zustand: Adds dependency, less explicit about actions
 * 
 * COMMON MISTAKE: Using multiple useState calls for related state.
 * This leads to inconsistent state and race conditions.
 * 
 * ```ts
 * // BAD - state can become inconsistent
 * const [player, setPlayer] = useState(null);
 * const [bid, setBid] = useState(0);
 * const [phase, setPhase] = useState('idle');
 * // If setPlayer succeeds but setBid fails, state is invalid!
 * 
 * // GOOD - single atomic update
 * dispatch({ type: 'START_BIDDING', payload: { player } });
 * // All related state updates happen together
 * ```
 */

import { useReducer, useCallback, useMemo } from 'react';
import {
  AuctionState,
  AuctionAction,
  Player,
  Team,
  TeamState,
  AUCTION_CONSTANTS,
} from '../domain/types';
import {
  updateTeamsAfterSale,
  validateBid,
  getMinimumValidBid,
  calculateTimeAfterBid,
} from '../domain/auctionRules';

// ============================================================================
// REDUCER
// ============================================================================

/**
 * The auction reducer - pure function that handles all state transitions.
 * 
 * WHY IS THIS PURE?
 * - Same inputs always produce same outputs
 * - No side effects (no API calls, no timers, no DOM manipulation)
 * - Enables time-travel debugging
 * - Easy to test: just call the function
 * 
 * IMMUTABILITY:
 * - Never mutate state directly
 * - Always return new objects
 * - Use spread operator for updates
 * 
 * EXHAUSTIVE HANDLING:
 * - TypeScript ensures all action types are handled
 * - The `default` case uses `never` type to catch missing cases
 */
export function auctionReducer(
  state: AuctionState,
  action: AuctionAction
): AuctionState {
  switch (action.type) {
    case 'START_BIDDING': {
      // Can only start bidding from idle state
      if (state.phase !== 'idle') {
        console.warn('Cannot start bidding: not in idle state');
        return state;
      }

      return {
        phase: 'bidding',
        currentPlayer: action.payload.player,
        currentBid: null,
        timeRemaining: AUCTION_CONSTANTS.INITIAL_BID_TIME,
        completedPlayerIds: state.completedPlayerIds,
        teams: state.teams,
        message: `Bidding started for ${action.payload.player.name}`,
      };
    }

    case 'PLACE_BID': {
      // Can only place bid during active bidding
      if (state.phase !== 'bidding') {
        console.warn('Cannot place bid: not in bidding state');
        return state;
      }

      /**
       * NOTE: Validation should happen BEFORE dispatch.
       * The reducer assumes the action is valid.
       * This keeps the reducer simple and validation reusable.
       */
      return {
        ...state,
        currentBid: {
          teamId: action.payload.teamId,
          amount: action.payload.amount,
        },
        timeRemaining: calculateTimeAfterBid(state.timeRemaining),
        message: `${action.payload.teamId} bids ₹${action.payload.amount}L`,
      };
    }

    case 'INVALID_BID': {
      // Just update the message, don't change other state
      if (state.phase !== 'bidding') {
        return state;
      }

      return {
        ...state,
        message: `Invalid bid: ${action.payload.reason}`,
      };
    }

    case 'TIMER_TICK': {
      // Only tick during active bidding
      if (state.phase !== 'bidding') {
        return state;
      }

      const newTime = state.timeRemaining - 1;
      
      if (newTime <= 0) {
        // Time expired - this will be handled by TIME_EXPIRED action
        // But we still update the time to 0
        return {
          ...state,
          timeRemaining: 0,
        };
      }

      return {
        ...state,
        timeRemaining: newTime,
      };
    }

    case 'TIME_EXPIRED': {
      if (state.phase !== 'bidding') {
        return state;
      }

      // If there's a bid, mark as sold; otherwise unsold
      if (state.currentBid !== null) {
        return {
          phase: 'sold',
          soldPlayer: state.currentPlayer,
          winningBid: state.currentBid,
          completedPlayerIds: [...state.completedPlayerIds, state.currentPlayer.id],
          teams: updateTeamsAfterSale(
            state.teams,
            state.currentBid.teamId,
            state.currentPlayer.id,
            state.currentBid.amount
          ),
          message: `SOLD! ${state.currentPlayer.name} to ${state.currentBid.teamId} for ₹${state.currentBid.amount}L`,
        };
      } else {
        return {
          phase: 'unsold',
          unsoldPlayer: state.currentPlayer,
          completedPlayerIds: [...state.completedPlayerIds, state.currentPlayer.id],
          teams: state.teams,
          message: `UNSOLD! ${state.currentPlayer.name} received no bids`,
        };
      }
    }

    case 'PLAYER_SOLD': {
      // Explicit action to mark player as sold (alternative to time expiry)
      if (state.phase !== 'bidding' || state.currentBid === null) {
        return state;
      }

      return {
        phase: 'sold',
        soldPlayer: state.currentPlayer,
        winningBid: state.currentBid,
        completedPlayerIds: [...state.completedPlayerIds, state.currentPlayer.id],
        teams: updateTeamsAfterSale(
          state.teams,
          state.currentBid.teamId,
          state.currentPlayer.id,
          state.currentBid.amount
        ),
        message: `SOLD! ${state.currentPlayer.name} to ${state.currentBid.teamId} for ₹${state.currentBid.amount}L`,
      };
    }

    case 'PLAYER_UNSOLD': {
      if (state.phase !== 'bidding') {
        return state;
      }

      return {
        phase: 'unsold',
        unsoldPlayer: state.currentPlayer,
        completedPlayerIds: [...state.completedPlayerIds, state.currentPlayer.id],
        teams: state.teams,
        message: `UNSOLD! ${state.currentPlayer.name} - passed`,
      };
    }

    case 'RESET_TO_IDLE': {
      return {
        phase: 'idle',
        completedPlayerIds: state.completedPlayerIds,
        teams: state.teams,
        message: null,
      };
    }

    default: {
      /**
       * EXHAUSTIVENESS CHECK
       * 
       * If TypeScript complains here, you added an action type
       * but didn't handle it in the switch. This catches bugs at
       * compile time.
       */
      const _exhaustiveCheck: never = action;
      console.error('Unhandled action:', _exhaustiveCheck);
      return state;
    }
  }
}

// ============================================================================
// INITIAL STATE FACTORY
// ============================================================================

/**
 * Creates initial auction state from teams data.
 * 
 * WHY A FACTORY FUNCTION?
 * - Teams data comes from props/API
 * - Need to transform Team[] into TeamState[]
 * - Single place to set up initial state shape
 */
export function createInitialState(teams: Team[]): AuctionState {
  const teamStates: TeamState[] = teams.map(team => ({
    teamId: team.id,
    remainingBudget: team.budget,
    squad: [],
  }));

  return {
    phase: 'idle',
    completedPlayerIds: [],
    teams: teamStates,
    message: 'Welcome to the auction! Select a player to begin.',
  };
}

// ============================================================================
// CUSTOM HOOK
// ============================================================================

/**
 * Props for the useAuction hook.
 */
type UseAuctionProps = {
  teams: Team[];
  players: Player[];
};

/**
 * Return type for the useAuction hook.
 * 
 * WHY EXPLICIT RETURN TYPE?
 * - Documents the hook's API
 * - Prevents accidental API changes
 * - Better IDE autocomplete
 */
type UseAuctionReturn = {
  state: AuctionState;
  actions: {
    startBidding: (player: Player) => void;
    placeBid: (teamId: string, amount: number) => void;
    tick: () => void;
    handleTimeExpired: () => void;
    resetToIdle: () => void;
    passPlayer: () => void;
  };
  queries: {
    getMinBid: () => number | null;
    getRemainingPlayers: () => Player[];
    canTeamAfford: (teamId: string, amount: number) => boolean;
  };
};

/**
 * The main auction hook.
 * 
 * SEPARATION OF CONCERNS:
 * - `state`: Current auction state (read-only)
 * - `actions`: Functions to dispatch actions (with validation)
 * - `queries`: Derived data and helper queries
 * 
 * WHY WRAP DISPATCH in action functions?
 * - Encapsulates action shape
 * - Can add validation before dispatch
 * - Easier to use from components
 * 
 * COMMON MISTAKE: Exposing raw dispatch to components.
 * That couples components to action shapes and bypasses validation.
 */
export function useAuction({ teams, players }: UseAuctionProps): UseAuctionReturn {
  const [state, dispatch] = useReducer(
    auctionReducer,
    teams,
    createInitialState
  );

  /**
   * ACTION CREATORS
   * 
   * WHY useCallback?
   * These functions are passed to child components. Without useCallback,
   * new function references are created on every render, causing
   * unnecessary re-renders in children that use React.memo.
   * 
   * WHEN NOT TO USE useCallback:
   * - Functions only used in this component (no child prop passing)
   * - Components that don't use React.memo
   * - When the deps array would change frequently anyway
   */

  const startBidding = useCallback((player: Player) => {
    dispatch({ type: 'START_BIDDING', payload: { player } });
  }, []);

  const placeBid = useCallback((teamId: string, amount: number) => {
    // Validate before dispatching
    if (state.phase !== 'bidding') {
      dispatch({ 
        type: 'INVALID_BID', 
        payload: { reason: 'Auction not active' } 
      });
      return;
    }

    const validation = validateBid(state, teamId, amount, players);
    if (!validation.isValid) {
      dispatch({ 
        type: 'INVALID_BID', 
        payload: { reason: validation.errors[0]?.message ?? 'Invalid bid' } 
      });
      return;
    }

    dispatch({ type: 'PLACE_BID', payload: { teamId, amount } });
  }, [state, players]);

  const tick = useCallback(() => {
    dispatch({ type: 'TIMER_TICK' });
  }, []);

  const handleTimeExpired = useCallback(() => {
    dispatch({ type: 'TIME_EXPIRED' });
  }, []);

  const resetToIdle = useCallback(() => {
    dispatch({ type: 'RESET_TO_IDLE' });
  }, []);

  const passPlayer = useCallback(() => {
    dispatch({ type: 'PLAYER_UNSOLD' });
  }, []);

  /**
   * QUERY FUNCTIONS
   * 
   * These derive values from state. Some use useMemo for expensive
   * computations, others are simple enough to not need it.
   * 
   * WHEN TO USE useMemo:
   * - Expensive computations (O(n²) or worse)
   * - Creating new objects/arrays passed as props
   * - When profiling shows re-render issues
   * 
   * WHEN NOT TO USE useMemo:
   * - Simple lookups
   * - Values only used for display (not props)
   * - When deps change on every render anyway
   */

  const getMinBid = useCallback((): number | null => {
    if (state.phase !== 'bidding') return null;
    return getMinimumValidBid(state);
  }, [state]);

  /**
   * Get players not yet auctioned.
   * 
   * useMemo IS justified here because:
   * - Filter operation on potentially large array
   * - Result is passed to child components
   * - Only recomputes when deps actually change
   */
  const remainingPlayers = useMemo(() => {
    return players.filter(p => !state.completedPlayerIds.includes(p.id));
  }, [players, state.completedPlayerIds]);

  const getRemainingPlayers = useCallback(() => remainingPlayers, [remainingPlayers]);

  const canTeamAfford = useCallback((teamId: string, amount: number): boolean => {
    const team = state.teams.find(t => t.teamId === teamId);
    return team ? team.remainingBudget >= amount : false;
  }, [state.teams]);

  return {
    state,
    actions: {
      startBidding,
      placeBid,
      tick,
      handleTimeExpired,
      resetToIdle,
      passPlayer,
    },
    queries: {
      getMinBid,
      getRemainingPlayers,
      canTeamAfford,
    },
  };
}
