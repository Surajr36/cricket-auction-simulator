/**
 * useAuctionTimer - Custom hook for managing auction countdown.
 * 
 * ARCHITECTURE DECISION: Why is timer logic in a separate hook?
 * 
 * 1. SEPARATION OF CONCERNS:
 *    - useAuction handles state transitions
 *    - useAuctionTimer handles the timing mechanism
 *    - Each hook has a single responsibility
 * 
 * 2. COMPLEXITY ISOLATION:
 *    - Timer logic is tricky (intervals, cleanup, stale closures)
 *    - Isolating it makes bugs easier to find and fix
 *    - Main auction logic stays clean
 * 
 * 3. REUSABILITY:
 *    - Timer pattern could be used elsewhere
 *    - Easy to test in isolation
 * 
 * 4. INTERVIEW DEFENSE:
 *    - Shows you understand useEffect cleanup
 *    - Demonstrates handling of stale closures
 *    - Proves you can extract complex logic into hooks
 * 
 * COMMON MISTAKES THIS HOOK AVOIDS:
 * 
 * 1. STALE CLOSURES:
 *    ```ts
 *    // BAD - closure captures old value
 *    useEffect(() => {
 *      const id = setInterval(() => {
 *        setTime(time - 1); // 'time' is stale!
 *      }, 1000);
 *      return () => clearInterval(id);
 *    }, []); // Empty deps = closure never updates
 *    
 *    // GOOD - use functional update
 *    setTime(prev => prev - 1); // Always uses current value
 *    ```
 * 
 * 2. MEMORY LEAKS:
 *    ```ts
 *    // BAD - interval continues after unmount
 *    useEffect(() => {
 *      setInterval(() => tick(), 1000);
 *      // No cleanup!
 *    }, []);
 *    
 *    // GOOD - cleanup on unmount
 *    useEffect(() => {
 *      const id = setInterval(() => tick(), 1000);
 *      return () => clearInterval(id); // Cleanup!
 *    }, []);
 *    ```
 * 
 * 3. MULTIPLE INTERVALS:
 *    ```ts
 *    // BAD - deps array causes new interval on every tick
 *    useEffect(() => {
 *      const id = setInterval(() => tick(), 1000);
 *      return () => clearInterval(id);
 *    }, [time]); // New interval every second!
 *    
 *    // GOOD - stable deps, external state management
 *    useEffect(() => {
 *      if (!isRunning) return;
 *      const id = setInterval(() => tick(), 1000);
 *      return () => clearInterval(id);
 *    }, [isRunning, tick]); // Only changes when state changes
 *    ```
 */

import { useEffect, useRef } from 'react';
import { AuctionState } from '../domain/types';

/**
 * Props for useAuctionTimer hook.
 */
type UseAuctionTimerProps = {
  state: AuctionState;
  onTick: () => void;
  onExpired: () => void;
};

/**
 * Return type for useAuctionTimer.
 */
type UseAuctionTimerReturn = {
  timeRemaining: number;
  isRunning: boolean;
};

/**
 * Custom hook for managing the auction countdown timer.
 * 
 * HOW IT WORKS:
 * 1. Watches auction state for 'bidding' phase
 * 2. When bidding starts, sets up an interval
 * 3. Calls onTick every second
 * 4. When time hits 0, calls onExpired
 * 5. Cleans up interval on phase change or unmount
 * 
 * WHY useRef FOR CALLBACKS?
 * - Refs provide stable references that don't trigger re-renders
 * - Allows interval callback to always access latest function versions
 * - Avoids stale closure problem without adding deps to useEffect
 * 
 * ALTERNATIVE: useCallback with deps
 * - Would cause interval restart on every callback change
 * - More complex dependency management
 * - Rejected because ref pattern is cleaner here
 */
export function useAuctionTimer({
  state,
  onTick,
  onExpired,
}: UseAuctionTimerProps): UseAuctionTimerReturn {
  /**
   * Store callbacks in refs to avoid stale closure issues.
   * 
   * WHY THIS PATTERN?
   * The interval callback captures variables at creation time.
   * If we used the callbacks directly, they'd be stale.
   * Refs let us access the latest values without recreating the interval.
   */
  const onTickRef = useRef(onTick);
  const onExpiredRef = useRef(onExpired);

  // Keep refs up to date
  useEffect(() => {
    onTickRef.current = onTick;
    onExpiredRef.current = onExpired;
  }, [onTick, onExpired]);

  /**
   * Track if timer should be running.
   * Only run during active bidding phase.
   */
  const isRunning = state.phase === 'bidding';
  const timeRemaining = state.phase === 'bidding' ? state.timeRemaining : 0;

  /**
   * Main timer effect.
   * 
   * CRITICAL: This effect must:
   * 1. Start interval only when isRunning is true
   * 2. Clean up interval when isRunning becomes false
   * 3. Clean up interval on component unmount
   * 4. Not create multiple intervals
   */
  useEffect(() => {
    if (!isRunning) {
      return; // No cleanup needed if not running
    }

    /**
     * Interval callback.
     * 
     * WHY CHECK timeRemaining HERE?
     * - Can't use timeRemaining from closure (stale)
     * - Would need to track in ref, but onTick/onExpired
     *   already handle the state transitions
     * - Trust the reducer to track time accurately
     */
    const intervalId = setInterval(() => {
      onTickRef.current();
    }, 1000);

    /**
     * CLEANUP FUNCTION
     * 
     * This runs:
     * - When isRunning changes (phase changes)
     * - When component unmounts
     * 
     * Without this, intervals would stack up or continue
     * running after component is gone (memory leak).
     */
    return () => {
      clearInterval(intervalId);
    };
  }, [isRunning]); // Only restart when running state changes

  /**
   * Effect to check for expiration.
   * 
   * WHY SEPARATE FROM TICK?
   * - Checking time in interval callback would be stale
   * - This effect runs when timeRemaining changes
   * - More reliable than checking in interval
   */
  useEffect(() => {
    if (isRunning && timeRemaining === 0) {
      onExpiredRef.current();
    }
  }, [isRunning, timeRemaining]);

  return {
    timeRemaining,
    isRunning,
  };
}

/**
 * TESTING NOTES:
 * 
 * To test this hook:
 * 1. Mock timers with jest.useFakeTimers()
 * 2. Render hook with test state
 * 3. Advance time with jest.advanceTimersByTime(1000)
 * 4. Assert onTick was called
 * 
 * Example:
 * ```ts
 * jest.useFakeTimers();
 * const onTick = jest.fn();
 * const { result } = renderHook(() => useAuctionTimer({
 *   state: { phase: 'bidding', timeRemaining: 5, ... },
 *   onTick,
 *   onExpired: jest.fn(),
 * }));
 * 
 * jest.advanceTimersByTime(3000);
 * expect(onTick).toHaveBeenCalledTimes(3);
 * ```
 */
