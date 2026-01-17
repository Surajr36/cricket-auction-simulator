/**
 * Squad Validator - Pure validation functions for squad composition.
 * 
 * ARCHITECTURE DECISION: Why validation is in domain, not in components?
 * 
 * 1. TESTABILITY: These functions are pure - same input always produces same output.
 *    You can test them exhaustively without React, without mocking, without DOM.
 * 
 * 2. REUSABILITY: Validation logic is needed in:
 *    - The reducer (to prevent invalid state transitions)
 *    - Components (to show validation messages)
 *    - AI recommendations (to respect constraints)
 *    Having it in one place avoids duplication and inconsistency.
 * 
 * 3. SINGLE RESPONSIBILITY: Components render UI. Validators validate.
 *    Mixing them violates SRP and makes both harder to maintain.
 * 
 * ALTERNATIVES CONSIDERED:
 * - Validation in components: Rejected - untestable, duplicated across components
 * - Validation in reducer only: Rejected - can't show proactive warnings in UI
 * - Using a validation library (Zod, Yup): Rejected - adds dependency for simple rules
 * 
 * COMMON MISTAKE: Throwing errors for validation failures.
 * We return ValidationResult objects instead, allowing:
 * - Multiple errors to be collected
 * - User-friendly messages to be displayed
 * - Validation to be composable
 */

import {
  AcquiredPlayer,
  Player,
  PlayerRole,
  SquadConstraints,
  TeamState,
  ValidationError,
  ValidationResult,
  DEFAULT_SQUAD_CONSTRAINTS,
} from './types';

// ============================================================================
// CORE VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validates if a team can acquire a player at a given price.
 * This is the main entry point for bid validation.
 * 
 * WHY COMBINE MULTIPLE CHECKS?
 * - A single function call for "can this team buy this player?"
 * - Collects all errors at once, not just the first one
 * - Better UX: user sees all problems, not one at a time
 */
export function validatePlayerAcquisition(
  teamState: TeamState,
  player: Player,
  bidAmount: number,
  allPlayers: ReadonlyArray<Player>,
  constraints: SquadConstraints = DEFAULT_SQUAD_CONSTRAINTS
): ValidationResult {
  const errors: ValidationError[] = [];

  // Check budget
  const budgetResult = validateBudget(teamState, bidAmount);
  if (!budgetResult.isValid) {
    errors.push(...budgetResult.errors);
  }

  // Check squad size
  const squadSizeResult = validateSquadSize(teamState, constraints);
  if (!squadSizeResult.isValid) {
    errors.push(...squadSizeResult.errors);
  }

  // Check role limits
  const roleResult = validateRoleLimits(teamState, player, allPlayers, constraints);
  if (!roleResult.isValid) {
    errors.push(...roleResult.errors);
  }

  // Check overseas limits
  const overseasResult = validateOverseasLimits(teamState, player, allPlayers, constraints);
  if (!overseasResult.isValid) {
    errors.push(...overseasResult.errors);
  }

  return errors.length === 0 
    ? { isValid: true } 
    : { isValid: false, errors };
}

/**
 * Validates team has sufficient budget.
 * 
 * WHY A SEPARATE FUNCTION?
 * - Can be called independently for quick checks
 * - Easy to unit test in isolation
 * - Clear single responsibility
 */
export function validateBudget(
  teamState: TeamState,
  bidAmount: number
): ValidationResult {
  if (bidAmount > teamState.remainingBudget) {
    return {
      isValid: false,
      errors: [{
        code: 'INSUFFICIENT_BUDGET',
        message: `Insufficient budget. Required: ₹${bidAmount}L, Available: ₹${teamState.remainingBudget}L`,
        context: {
          required: bidAmount,
          available: teamState.remainingBudget,
          shortfall: bidAmount - teamState.remainingBudget,
        },
      }],
    };
  }
  return { isValid: true };
}

/**
 * Validates squad hasn't exceeded maximum size.
 */
export function validateSquadSize(
  teamState: TeamState,
  constraints: SquadConstraints = DEFAULT_SQUAD_CONSTRAINTS
): ValidationResult {
  if (teamState.squad.length >= constraints.maxSquadSize) {
    return {
      isValid: false,
      errors: [{
        code: 'SQUAD_FULL',
        message: `Squad is full. Maximum ${constraints.maxSquadSize} players allowed.`,
        context: {
          currentSize: teamState.squad.length,
          maxSize: constraints.maxSquadSize,
        },
      }],
    };
  }
  return { isValid: true };
}

/**
 * Validates role-specific limits.
 * 
 * WHY PASS allPlayers?
 * We need to look up player roles for the acquired players.
 * This is a design trade-off:
 * - Option A: Store role in AcquiredPlayer (denormalized, can get stale)
 * - Option B: Look up from allPlayers (normalized, always accurate)
 * 
 * We chose Option B for data integrity. The slight performance cost
 * is negligible for squad sizes of 15-25 players.
 */
export function validateRoleLimits(
  teamState: TeamState,
  newPlayer: Player,
  allPlayers: ReadonlyArray<Player>,
  constraints: SquadConstraints = DEFAULT_SQUAD_CONSTRAINTS
): ValidationResult {
  const roleCount = countPlayersByRole(teamState.squad, allPlayers);
  const currentCount = roleCount[newPlayer.role] ?? 0;
  const maxForRole = constraints.roleConstraints[newPlayer.role].max;

  if (currentCount >= maxForRole) {
    return {
      isValid: false,
      errors: [{
        code: 'ROLE_LIMIT_EXCEEDED',
        message: `Cannot add more ${newPlayer.role}s. Maximum ${maxForRole} allowed, currently have ${currentCount}.`,
        context: {
          role: newPlayer.role,
          currentCount,
          maxCount: maxForRole,
        },
      }],
    };
  }
  return { isValid: true };
}

/**
 * Validates overseas player limits.
 */
export function validateOverseasLimits(
  teamState: TeamState,
  newPlayer: Player,
  allPlayers: ReadonlyArray<Player>,
  constraints: SquadConstraints = DEFAULT_SQUAD_CONSTRAINTS
): ValidationResult {
  if (newPlayer.nationality !== 'overseas') {
    return { isValid: true }; // No limit for domestic players
  }

  const overseasCount = countOverseasPlayers(teamState.squad, allPlayers);

  if (overseasCount >= constraints.maxOverseasPlayers) {
    return {
      isValid: false,
      errors: [{
        code: 'OVERSEAS_LIMIT_EXCEEDED',
        message: `Cannot add more overseas players. Maximum ${constraints.maxOverseasPlayers} allowed, currently have ${overseasCount}.`,
        context: {
          currentCount: overseasCount,
          maxCount: constraints.maxOverseasPlayers,
        },
      }],
    };
  }
  return { isValid: true };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Counts players by role in a squad.
 * 
 * WHY RETURN A PARTIAL RECORD?
 * - Roles with 0 players won't have an entry
 * - Caller must handle undefined (TypeScript enforces this)
 * - More accurate than assuming all roles are present
 */
export function countPlayersByRole(
  squad: ReadonlyArray<AcquiredPlayer>,
  allPlayers: ReadonlyArray<Player>
): Partial<Record<PlayerRole, number>> {
  const playerMap = new Map(allPlayers.map(p => [p.id, p]));
  
  return squad.reduce<Partial<Record<PlayerRole, number>>>((counts, acquired) => {
    const player = playerMap.get(acquired.playerId);
    if (player) {
      const currentCount = counts[player.role] ?? 0;
      counts[player.role] = currentCount + 1;
    }
    return counts;
  }, {});
}

/**
 * Counts overseas players in a squad.
 */
export function countOverseasPlayers(
  squad: ReadonlyArray<AcquiredPlayer>,
  allPlayers: ReadonlyArray<Player>
): number {
  const playerMap = new Map(allPlayers.map(p => [p.id, p]));
  
  return squad.filter(acquired => {
    const player = playerMap.get(acquired.playerId);
    return player?.nationality === 'overseas';
  }).length;
}

/**
 * Checks if a squad meets minimum requirements.
 * Used at end of auction to validate final squads.
 */
export function validateMinimumSquadRequirements(
  teamState: TeamState,
  allPlayers: ReadonlyArray<Player>,
  constraints: SquadConstraints = DEFAULT_SQUAD_CONSTRAINTS
): ValidationResult {
  const errors: ValidationError[] = [];

  // Check minimum squad size
  if (teamState.squad.length < constraints.minSquadSize) {
    errors.push({
      code: 'SQUAD_FULL', // Reusing code, could add a new one
      message: `Squad too small. Minimum ${constraints.minSquadSize} players required, have ${teamState.squad.length}.`,
      context: {
        currentSize: teamState.squad.length,
        minSize: constraints.minSquadSize,
      },
    });
  }

  // Check minimum role requirements
  const roleCount = countPlayersByRole(teamState.squad, allPlayers);
  
  for (const [role, limits] of Object.entries(constraints.roleConstraints)) {
    const currentCount = roleCount[role as PlayerRole] ?? 0;
    if (currentCount < limits.min) {
      errors.push({
        code: 'ROLE_LIMIT_EXCEEDED',
        message: `Need at least ${limits.min} ${role}(s), have ${currentCount}.`,
        context: {
          role,
          currentCount,
          minCount: limits.min,
        },
      });
    }
  }

  return errors.length === 0 
    ? { isValid: true } 
    : { isValid: false, errors };
}

/**
 * Gets a summary of squad composition for display.
 */
export function getSquadSummary(
  teamState: TeamState,
  allPlayers: ReadonlyArray<Player>,
  constraints: SquadConstraints = DEFAULT_SQUAD_CONSTRAINTS
): {
  totalPlayers: number;
  maxPlayers: number;
  overseasCount: number;
  maxOverseas: number;
  roleBreakdown: Record<PlayerRole, { current: number; min: number; max: number }>;
  budgetUsed: number;
  budgetRemaining: number;
} {
  const roleCount = countPlayersByRole(teamState.squad, allPlayers);
  
  const roleBreakdown = {} as Record<PlayerRole, { current: number; min: number; max: number }>;
  
  for (const [role, limits] of Object.entries(constraints.roleConstraints)) {
    roleBreakdown[role as PlayerRole] = {
      current: roleCount[role as PlayerRole] ?? 0,
      min: limits.min,
      max: limits.max,
    };
  }

  const totalSpent = teamState.squad.reduce((sum, p) => sum + p.purchasePrice, 0);

  return {
    totalPlayers: teamState.squad.length,
    maxPlayers: constraints.maxSquadSize,
    overseasCount: countOverseasPlayers(teamState.squad, allPlayers),
    maxOverseas: constraints.maxOverseasPlayers,
    roleBreakdown,
    budgetUsed: totalSpent,
    budgetRemaining: teamState.remainingBudget,
  };
}
