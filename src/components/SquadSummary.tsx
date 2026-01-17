/**
 * SquadSummary - Displays a team's current squad composition.
 * 
 * COMPONENT PURPOSE:
 * - Show team budget status
 * - Display players by role
 * - Indicate constraint status (min/max reached)
 * 
 * WHY SEPARATE COMPONENT?
 * - Complex enough to warrant isolation
 * - Used multiple times (one per team)
 * - Testable in isolation
 */

import React from 'react';
import { Team, Player, TeamState, PlayerRole } from '../domain/types';
import { getSquadSummary } from '../domain/squadValidator';

type SquadSummaryProps = {
  team: Team;
  teamState: TeamState;
  allPlayers: ReadonlyArray<Player>;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
};

/**
 * Role display configuration.
 */
const ROLE_CONFIG: Record<PlayerRole, { emoji: string; label: string }> = {
  'batter': { emoji: '🏏', label: 'Batters' },
  'bowler': { emoji: '🎯', label: 'Bowlers' },
  'all-rounder': { emoji: '⚡', label: 'All-rounders' },
  'wicket-keeper': { emoji: '🧤', label: 'Wicket-keepers' },
};

/**
 * SquadSummary Component
 * 
 * PERFORMANCE NOTE:
 * - Wrapped in React.memo because:
 *   - Multiple teams displayed simultaneously
 *   - Team data changes infrequently (only on purchases)
 *   - getSquadSummary computation is non-trivial
 */
function SquadSummaryComponent({
  team,
  teamState,
  allPlayers,
  isExpanded = false,
  onToggleExpand,
}: SquadSummaryProps): React.ReactElement {
  const summary = getSquadSummary(teamState, allPlayers);

  const containerStyle: React.CSSProperties = {
    border: '1px solid #ddd',
    borderRadius: '8px',
    marginBottom: '12px',
    overflow: 'hidden',
  };

  const headerStyle: React.CSSProperties = {
    padding: '12px 16px',
    backgroundColor: team.primaryColor,
    color: '#fff',
    cursor: onToggleExpand ? 'pointer' : 'default',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  };

  const bodyStyle: React.CSSProperties = {
    padding: isExpanded ? '16px' : '0 16px',
    maxHeight: isExpanded ? '500px' : '0',
    overflow: 'hidden',
    transition: 'all 0.3s ease',
    backgroundColor: '#fff',
  };

  const budgetBarStyle: React.CSSProperties = {
    height: '8px',
    borderRadius: '4px',
    backgroundColor: '#e9ecef',
    overflow: 'hidden',
    marginTop: '8px',
  };

  const budgetFillStyle: React.CSSProperties = {
    height: '100%',
    backgroundColor: summary.budgetRemaining < 100 ? '#dc3545' : 
                     summary.budgetRemaining < 300 ? '#ffc107' : '#28a745',
    width: `${(summary.budgetUsed / (summary.budgetUsed + summary.budgetRemaining)) * 100}%`,
    transition: 'width 0.3s ease',
  };

  /**
   * Helper to render role status.
   */
  const renderRoleStatus = (role: PlayerRole) => {
    const config = ROLE_CONFIG[role];
    const roleData = summary.roleBreakdown[role];
    
    const isAtMin = roleData.current < roleData.min;
    const isAtMax = roleData.current >= roleData.max;
    
    const statusColor = isAtMin ? '#dc3545' : isAtMax ? '#6c757d' : '#28a745';

    return (
      <div key={role} style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        padding: '4px 0',
        borderBottom: '1px solid #eee',
      }}>
        <span>
          {config.emoji} {config.label}
        </span>
        <span style={{ color: statusColor }}>
          {roleData.current}/{roleData.min}-{roleData.max}
          {isAtMin && ' ⚠️'}
          {isAtMax && ' ✓'}
        </span>
      </div>
    );
  };

  /**
   * Get players in squad with their details.
   */
  const squadPlayers = teamState.squad.map(acquired => {
    const player = allPlayers.find(p => p.id === acquired.playerId);
    return player ? { ...player, purchasePrice: acquired.purchasePrice } : null;
  }).filter((p): p is Player & { purchasePrice: number } => p !== null);

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div 
        style={headerStyle}
        onClick={onToggleExpand}
        onKeyDown={(e) => {
          if (onToggleExpand && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onToggleExpand();
          }
        }}
        role={onToggleExpand ? 'button' : undefined}
        tabIndex={onToggleExpand ? 0 : undefined}
        aria-expanded={isExpanded}
      >
        <div>
          <strong style={{ fontSize: '16px' }}>{team.name}</strong>
          <div style={{ fontSize: '12px', opacity: 0.9 }}>
            {team.shortName}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
            ₹{summary.budgetRemaining}L
          </div>
          <div style={{ fontSize: '12px' }}>
            {summary.totalPlayers}/{summary.maxPlayers} players
          </div>
        </div>
      </div>

      {/* Body (collapsible) */}
      <div style={bodyStyle}>
        {/* Budget Bar */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#666' }}>
            <span>Spent: ₹{summary.budgetUsed}L</span>
            <span>Remaining: ₹{summary.budgetRemaining}L</span>
          </div>
          <div style={budgetBarStyle}>
            <div style={budgetFillStyle} />
          </div>
        </div>

        {/* Overseas Count */}
        <div style={{ 
          marginBottom: '12px',
          padding: '8px',
          backgroundColor: '#f8f9fa',
          borderRadius: '4px',
        }}>
          <span>🌍 Overseas Players: </span>
          <strong style={{
            color: summary.overseasCount >= summary.maxOverseas ? '#dc3545' : '#333'
          }}>
            {summary.overseasCount}/{summary.maxOverseas}
          </strong>
        </div>

        {/* Role Breakdown */}
        <div style={{ marginBottom: '16px' }}>
          <strong style={{ display: 'block', marginBottom: '8px' }}>
            Squad Composition:
          </strong>
          {(Object.keys(ROLE_CONFIG) as PlayerRole[]).map(renderRoleStatus)}
        </div>

        {/* Squad List */}
        {squadPlayers.length > 0 && (
          <div>
            <strong style={{ display: 'block', marginBottom: '8px' }}>
              Acquired Players:
            </strong>
            <div style={{ 
              maxHeight: '200px', 
              overflowY: 'auto',
              border: '1px solid #eee',
              borderRadius: '4px',
            }}>
              {squadPlayers.map(player => (
                <div key={player.id} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderBottom: '1px solid #eee',
                }}>
                  <span>
                    {ROLE_CONFIG[player.role].emoji} {player.name}
                    {player.nationality === 'overseas' && ' 🌍'}
                  </span>
                  <span style={{ color: '#28a745' }}>
                    ₹{player.purchasePrice}L
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Memoized export.
 * 
 * WHY MEMO HERE?
 * - Multiple SquadSummary components rendered
 * - Each has complex nested rendering
 * - Props (teamState) only change when that team makes a purchase
 */
export const SquadSummary = React.memo(SquadSummaryComponent);
