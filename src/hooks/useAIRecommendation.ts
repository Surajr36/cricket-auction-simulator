/**
 * useAIRecommendation - Hook for AI-assisted bid recommendations.
 * 
 * ARCHITECTURE DECISION: Why a separate hook for AI?
 * 
 * 1. OPTIONAL FEATURE:
 *    - AI is assistive, not required for core auction
 *    - Separating it makes it easy to enable/disable
 *    - Won't affect other logic if removed
 * 
 * 2. EXPENSIVE COMPUTATION:
 *    - Recommendation calculation is non-trivial
 *    - Memoization is important here
 *    - Separate hook makes memoization boundaries clear
 * 
 * 3. CLEAR API:
 *    - Components just call the hook
 *    - Don't need to know calculation details
 *    - Easy to swap implementation later (e.g., real ML)
 * 
 * INTERVIEW DEFENSE:
 * Q: "Why not just calculate this inline in the component?"
 * A: - Computation is expensive (multiple loops, lookups)
 *    - Logic should be reusable across components
 *    - Testing is easier when isolated
 *    - Follows single responsibility principle
 */

import { useMemo } from 'react';
import {
  Player,
  TeamState,
  BidRecommendation,
} from '../domain/types';
import {
  calculateBidRecommendation,
  shouldConsiderPlayer,
} from '../domain/bidCalculator';

/**
 * Props for useAIRecommendation hook.
 */
type UseAIRecommendationProps = {
  player: Player | null;
  teamState: TeamState | null;
  allPlayers: ReadonlyArray<Player>;
  currentBid: number | null;
  isEnabled?: boolean;
};

/**
 * Return type for useAIRecommendation.
 */
type UseAIRecommendationReturn = {
  recommendation: BidRecommendation | null;
  shouldBid: boolean;
  skipReason: string | null;
};

/**
 * Hook for getting AI-assisted bid recommendations.
 * 
 * MEMOIZATION STRATEGY:
 * - useMemo is CRITICAL here because:
 *   1. Calculation involves multiple array operations
 *   2. Result is used in UI (re-render implications)
 *   3. Dependencies change infrequently
 * 
 * - We return an object, so without useMemo a new object
 *   would be created every render, potentially triggering
 *   re-renders in consuming components.
 * 
 * WHY NOT useCallback?
 * - We're not passing functions to children
 * - The calculation runs once per dependency change
 * - useMemo is for computed values, useCallback is for functions
 */
export function useAIRecommendation({
  player,
  teamState,
  allPlayers,
  currentBid,
  isEnabled = true,
}: UseAIRecommendationProps): UseAIRecommendationReturn {
  /**
   * Calculate recommendation when inputs change.
   * 
   * DEPENDENCY ANALYSIS:
   * - player: New player = new calculation
   * - teamState: Budget/squad changes = new calculation
   * - allPlayers: Rarely changes (static data)
   * - currentBid: Bid changes = need to recalculate minimum
   * - isEnabled: Feature toggle
   */
  const result = useMemo(() => {
    // Early returns for disabled/missing data
    if (!isEnabled) {
      return {
        recommendation: null,
        shouldBid: false,
        skipReason: 'AI recommendations disabled',
      };
    }

    if (!player) {
      return {
        recommendation: null,
        shouldBid: false,
        skipReason: 'No player selected',
      };
    }

    if (!teamState) {
      return {
        recommendation: null,
        shouldBid: false,
        skipReason: 'No team selected',
      };
    }

    // Quick check if team should consider this player at all
    const considerResult = shouldConsiderPlayer(player, teamState, allPlayers);
    
    if (!considerResult.shouldBid) {
      return {
        recommendation: null,
        shouldBid: false,
        skipReason: considerResult.reason,
      };
    }

    // Calculate full recommendation
    const recommendation = calculateBidRecommendation(
      player,
      teamState,
      allPlayers,
      currentBid
    );

    return {
      recommendation,
      shouldBid: true,
      skipReason: null,
    };
  }, [player, teamState, allPlayers, currentBid, isEnabled]);

  return result;
}

/**
 * IMPORTANT NOTES FOR INTERVIEWERS:
 * 
 * Q: "Is this real AI?"
 * A: No, and that's intentional. This is heuristic-based recommendation.
 *    Real AI/ML would require:
 *    - Training data (historical auction results)
 *    - Model training infrastructure
 *    - Inference API
 *    - Much more complexity
 * 
 *    For this use case, heuristics are:
 *    - Fast (no API calls)
 *    - Transparent (we show reasoning)
 *    - Good enough (handles common cases)
 *    - Interview appropriate (shows domain thinking)
 * 
 * Q: "When would you use real ML here?"
 * A: When:
 *    - You have historical data
 *    - Heuristics aren't capturing patterns
 *    - Users are making worse decisions than the algorithm
 *    - You can measure recommendation quality
 * 
 * Q: "Why show the reasoning?"
 * A: - Explainable AI is a key trend
 *    - Users trust what they understand
 *    - Helps users learn auction strategy
 *    - Makes debugging easier
 *    - Differentiates from "magic" black boxes
 */
