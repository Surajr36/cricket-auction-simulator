/**
 * Bid Calculator - AI-assisted bid recommendations.
 * 
 * ARCHITECTURE DECISION: Why is this called "AI" when it's just heuristics?
 * 
 * 1. PRODUCT VALUE: Even simple heuristics provide value to users:
 *    - Saves time calculating affordability
 *    - Considers factors users might forget
 *    - Provides a starting point for decisions
 * 
 * 2. TRANSPARENCY: We call it "AI-assisted" not "AI-powered" and:
 *    - Show all reasoning factors
 *    - Make clear it's a recommendation, not a command
 *    - Allow users to override
 * 
 * 3. INTERVIEW DEFENSE: Shows you understand:
 *    - "AI" in products is often heuristics, not ML
 *    - Explainability is crucial for user trust
 *    - Simple solutions can be effective
 * 
 * WHY NOT USE ACTUAL ML?
 * - No training data available
 * - Overkill for this use case
 * - Would be a black box users can't understand
 * - Adds complexity without proportional benefit
 * 
 * COMMON MISTAKE: Over-engineering AI features.
 * Start with simple heuristics, prove value, then add complexity if needed.
 */

import {
  BidRecommendation,
  Player,
  PlayerRole,
  ReasoningFactor,
  TeamState,
  DEFAULT_SQUAD_CONSTRAINTS,
} from './types';
import { countPlayersByRole, countOverseasPlayers } from './squadValidator';

// ============================================================================
// MAIN RECOMMENDATION FUNCTION
// ============================================================================

/**
 * Generates a bid recommendation for a player.
 * 
 * ALGORITHM OVERVIEW:
 * 1. Start with base price
 * 2. Adjust based on player quality (stats)
 * 3. Adjust based on team needs (role scarcity)
 * 4. Adjust based on budget constraints
 * 5. Cap at affordable maximum
 * 
 * WHY THIS ORDER?
 * - Player value is the baseline
 * - Team needs can increase urgency (pay premium)
 * - Budget is the hard constraint (can't exceed)
 */
export function calculateBidRecommendation(
  player: Player,
  teamState: TeamState,
  allPlayers: ReadonlyArray<Player>,
  currentBid: number | null
): BidRecommendation {
  const reasoning: ReasoningFactor[] = [];
  
  // Base calculation from player price
  let recommendedBid = player.basePrice;
  
  // Factor 1: Player quality (stats-based)
  const qualityMultiplier = calculateQualityMultiplier(player);
  const qualityAdjustedBid = recommendedBid * qualityMultiplier;
  
  reasoning.push({
    factor: 'Player Quality',
    impact: qualityMultiplier > 1 ? 'positive' : qualityMultiplier < 1 ? 'negative' : 'neutral',
    explanation: getQualityExplanation(player, qualityMultiplier),
  });
  
  recommendedBid = qualityAdjustedBid;

  // Factor 2: Role scarcity (team need)
  const scarcityMultiplier = calculateRoleScarcity(player.role, teamState, allPlayers);
  const scarcityAdjustedBid = recommendedBid * scarcityMultiplier;
  
  reasoning.push({
    factor: 'Role Scarcity',
    impact: scarcityMultiplier > 1 ? 'positive' : scarcityMultiplier < 1 ? 'negative' : 'neutral',
    explanation: getScarcityExplanation(player.role, scarcityMultiplier, teamState, allPlayers),
  });
  
  recommendedBid = scarcityAdjustedBid;

  // Factor 3: Overseas slot availability
  if (player.nationality === 'overseas') {
    const overseasMultiplier = calculateOverseasMultiplier(teamState, allPlayers);
    recommendedBid *= overseasMultiplier;
    
    reasoning.push({
      factor: 'Overseas Slot',
      impact: overseasMultiplier > 1 ? 'positive' : overseasMultiplier < 1 ? 'negative' : 'neutral',
      explanation: getOverseasExplanation(teamState, allPlayers, overseasMultiplier),
    });
  }

  // Factor 4: Budget constraint
  const budgetCap = calculateBudgetCap(teamState);
  const originalRecommendation = recommendedBid;
  recommendedBid = Math.min(recommendedBid, budgetCap);
  
  reasoning.push({
    factor: 'Budget Constraint',
    impact: recommendedBid < originalRecommendation ? 'negative' : 'neutral',
    explanation: `Budget allows up to ₹${budgetCap}L. ${recommendedBid < originalRecommendation ? 'Recommendation capped by budget.' : 'No budget constraint hit.'}`,
  });

  // Ensure recommendation is above current bid if there is one
  if (currentBid !== null && recommendedBid <= currentBid) {
    recommendedBid = currentBid + 5; // Minimum increment
    reasoning.push({
      factor: 'Current Bid',
      impact: 'neutral',
      explanation: `Adjusted to beat current bid of ₹${currentBid}L`,
    });
  }

  // Calculate confidence based on how many factors align
  const confidence = calculateConfidence(reasoning);

  return {
    recommendedMaxBid: Math.round(recommendedBid),
    confidence,
    reasoning,
  };
}

// ============================================================================
// MULTIPLIER CALCULATIONS
// ============================================================================

/**
 * Calculates quality multiplier based on player stats.
 * 
 * WHY MULTIPLIERS instead of additive bonuses?
 * - Scales naturally with base price
 * - A 5x multiplier means "worth 5x base price"
 * - Easier to reason about and tune
 */
function calculateQualityMultiplier(player: Player): number {
  const stats = player.stats;
  let multiplier = 1.0;

  // Experience factor
  if (stats.matches > 100) {
    multiplier += 0.3;
  } else if (stats.matches > 50) {
    multiplier += 0.15;
  }

  // Batting performance
  if (stats.battingAverage !== null) {
    if (stats.battingAverage > 40) {
      multiplier += 0.4;
    } else if (stats.battingAverage > 30) {
      multiplier += 0.2;
    }
  }

  // Strike rate (crucial in T20)
  if (stats.strikeRate !== null) {
    if (stats.strikeRate > 150) {
      multiplier += 0.3;
    } else if (stats.strikeRate > 130) {
      multiplier += 0.15;
    }
  }

  // Bowling performance
  if (stats.bowlingAverage !== null) {
    if (stats.bowlingAverage < 20) {
      multiplier += 0.4;
    } else if (stats.bowlingAverage < 25) {
      multiplier += 0.2;
    }
  }

  // Economy rate (crucial in T20)
  if (stats.economyRate !== null) {
    if (stats.economyRate < 7) {
      multiplier += 0.3;
    } else if (stats.economyRate < 8) {
      multiplier += 0.15;
    }
  }

  return multiplier;
}

/**
 * Calculates role scarcity multiplier.
 * If team needs this role badly, increase willingness to pay.
 */
function calculateRoleScarcity(
  role: PlayerRole,
  teamState: TeamState,
  allPlayers: ReadonlyArray<Player>
): number {
  const roleCount = countPlayersByRole(teamState.squad, allPlayers);
  const current = roleCount[role] ?? 0;
  const constraints = DEFAULT_SQUAD_CONSTRAINTS.roleConstraints[role];

  // If below minimum, high urgency
  if (current < constraints.min) {
    const shortfall = constraints.min - current;
    return 1 + (shortfall * 0.2); // +20% per player short
  }

  // If at maximum, no urgency
  if (current >= constraints.max) {
    return 0.5; // 50% discount - don't really need them
  }

  // Normal need
  return 1.0;
}

/**
 * Calculates overseas slot multiplier.
 */
function calculateOverseasMultiplier(
  teamState: TeamState,
  allPlayers: ReadonlyArray<Player>
): number {
  const overseasCount = countOverseasPlayers(teamState.squad, allPlayers);
  const maxOverseas = DEFAULT_SQUAD_CONSTRAINTS.maxOverseasPlayers;
  const slotsRemaining = maxOverseas - overseasCount;

  if (slotsRemaining <= 0) {
    return 0; // Can't buy
  } else if (slotsRemaining <= 2) {
    return 0.8; // Conserve slots
  } else {
    return 1.0;
  }
}

/**
 * Calculates maximum affordable bid considering future needs.
 * 
 * WHY NOT JUST USE remainingBudget?
 * - Need to reserve budget for mandatory positions
 * - A team with ₹500L but needing 10 more players can't spend ₹500L on one
 */
function calculateBudgetCap(teamState: TeamState): number {
  const playersNeeded = DEFAULT_SQUAD_CONSTRAINTS.minSquadSize - teamState.squad.length;
  
  if (playersNeeded <= 0) {
    // Squad complete, can spend freely
    return teamState.remainingBudget;
  }

  // Reserve minimum for remaining mandatory players (base price assumed ~20L)
  const reserveAmount = Math.max(0, (playersNeeded - 1) * 20);
  const spendableAmount = teamState.remainingBudget - reserveAmount;

  return Math.max(20, spendableAmount); // At least base price
}

// ============================================================================
// EXPLANATION GENERATORS
// ============================================================================

/**
 * Generates human-readable explanation for quality factor.
 */
function getQualityExplanation(player: Player, multiplier: number): string {
  const stats = player.stats;
  const highlights: string[] = [];

  if (stats.matches > 100) {
    highlights.push(`${stats.matches} matches experience`);
  }
  if (stats.battingAverage !== null && stats.battingAverage > 30) {
    highlights.push(`batting avg ${stats.battingAverage.toFixed(1)}`);
  }
  if (stats.strikeRate !== null && stats.strikeRate > 130) {
    highlights.push(`strike rate ${stats.strikeRate.toFixed(1)}`);
  }
  if (stats.bowlingAverage !== null && stats.bowlingAverage < 25) {
    highlights.push(`bowling avg ${stats.bowlingAverage.toFixed(1)}`);
  }
  if (stats.economyRate !== null && stats.economyRate < 8) {
    highlights.push(`economy ${stats.economyRate.toFixed(2)}`);
  }

  if (highlights.length === 0) {
    return 'Average statistics, no premium applied.';
  }

  const prefix = multiplier > 1.3 ? 'Excellent' : multiplier > 1 ? 'Good' : 'Moderate';
  return `${prefix} stats: ${highlights.join(', ')}.`;
}

/**
 * Generates explanation for role scarcity.
 */
function getScarcityExplanation(
  role: PlayerRole,
  multiplier: number,
  teamState: TeamState,
  allPlayers: ReadonlyArray<Player>
): string {
  const roleCount = countPlayersByRole(teamState.squad, allPlayers);
  const current = roleCount[role] ?? 0;
  const constraints = DEFAULT_SQUAD_CONSTRAINTS.roleConstraints[role];

  if (multiplier > 1) {
    const needed = constraints.min - current;
    return `URGENT: Need ${needed} more ${role}(s) to meet minimum requirement of ${constraints.min}.`;
  } else if (multiplier < 1) {
    return `Low priority: Already have ${current}/${constraints.max} ${role}(s).`;
  } else {
    return `Have ${current} ${role}(s), within normal range (${constraints.min}-${constraints.max}).`;
  }
}

/**
 * Generates explanation for overseas slot usage.
 */
function getOverseasExplanation(
  teamState: TeamState,
  allPlayers: ReadonlyArray<Player>,
  multiplier: number
): string {
  const overseasCount = countOverseasPlayers(teamState.squad, allPlayers);
  const maxOverseas = DEFAULT_SQUAD_CONSTRAINTS.maxOverseasPlayers;
  const remaining = maxOverseas - overseasCount;

  if (remaining <= 0) {
    return `Cannot buy: All ${maxOverseas} overseas slots used.`;
  } else if (remaining <= 2) {
    return `Caution: Only ${remaining} overseas slot(s) remaining. Conserve for high-value players.`;
  } else {
    return `${remaining} overseas slots available.`;
  }
}

/**
 * Calculates confidence based on factor alignment.
 */
function calculateConfidence(
  reasoning: ReasoningFactor[]
): 'low' | 'medium' | 'high' {
  const positives = reasoning.filter(r => r.impact === 'positive').length;
  const negatives = reasoning.filter(r => r.impact === 'negative').length;

  if (negatives >= 2) return 'low';
  if (positives >= 2 && negatives === 0) return 'high';
  return 'medium';
}

// ============================================================================
// QUICK CALCULATIONS FOR UI
// ============================================================================

/**
 * Quick check if team should consider bidding at all.
 * Used for quick filtering before full recommendation.
 */
export function shouldConsiderPlayer(
  player: Player,
  teamState: TeamState,
  allPlayers: ReadonlyArray<Player>
): { shouldBid: boolean; reason: string } {
  // Check overseas limit
  if (player.nationality === 'overseas') {
    const overseasCount = countOverseasPlayers(teamState.squad, allPlayers);
    if (overseasCount >= DEFAULT_SQUAD_CONSTRAINTS.maxOverseasPlayers) {
      return { shouldBid: false, reason: 'No overseas slots available' };
    }
  }

  // Check role limit
  const roleCount = countPlayersByRole(teamState.squad, allPlayers);
  const current = roleCount[player.role] ?? 0;
  const max = DEFAULT_SQUAD_CONSTRAINTS.roleConstraints[player.role].max;
  if (current >= max) {
    return { shouldBid: false, reason: `Already have maximum ${player.role}s` };
  }

  // Check budget
  if (teamState.remainingBudget < player.basePrice) {
    return { shouldBid: false, reason: 'Insufficient budget for base price' };
  }

  return { shouldBid: true, reason: 'Player is a valid target' };
}
