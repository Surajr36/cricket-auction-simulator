/**
 * PlayerCard - Displays individual player information.
 * 
 * COMPONENT DESIGN:
 * - Presentational component (no state management)
 * - Receives all data via props
 * - Easy to test and reuse
 * 
 * WHY PRESENTATIONAL COMPONENTS?
 * - Separation of concerns: display vs logic
 * - Easier testing: just pass props, check output
 * - Reusable: same component, different data
 * 
 * PERFORMANCE:
 * - Uses React.memo for shallow prop comparison
 * - Only re-renders when props actually change
 * - Props are primitive or stable references
 */

import React from 'react';
import { Player, PlayerRole, PlayerNationality } from '../domain/types';

/**
 * Props interface with explicit types.
 * 
 * WHY EXPLICIT PROPS TYPE?
 * - Documents component API
 * - TypeScript catches prop mismatches
 * - IDE autocomplete works perfectly
 */
type PlayerCardProps = {
  player: Player;
  isSelected?: boolean;
  isSold?: boolean;
  soldTo?: string;
  soldPrice?: number;
  onClick?: (player: Player) => void;
};

/**
 * Helper to get role emoji for visual distinction.
 */
function getRoleEmoji(role: PlayerRole): string {
  const roleEmojis: Record<PlayerRole, string> = {
    'batter': '🏏',
    'bowler': '🎯',
    'all-rounder': '⚡',
    'wicket-keeper': '🧤',
  };
  return roleEmojis[role];
}

/**
 * Helper to format nationality.
 */
function getNationalityBadge(nationality: PlayerNationality): string {
  return nationality === 'overseas' ? '🌍' : '🏠';
}

/**
 * PlayerCard Component
 * 
 * INTERVIEW TIP: Notice how this component is:
 * 1. Pure - same props = same output
 * 2. Focused - only displays player info
 * 3. Typed - all props have explicit types
 * 4. Memoized - wrapped with React.memo
 */
function PlayerCardComponent({
  player,
  isSelected = false,
  isSold = false,
  soldTo,
  soldPrice,
  onClick,
}: PlayerCardProps): React.ReactElement {
  /**
   * WHY INLINE STYLES?
   * 
   * For this project, inline styles keep things simple.
   * In production, you'd use:
   * - CSS Modules
   * - Styled Components
   * - Tailwind
   * 
   * But those add dependencies and complexity we want to avoid.
   */
  const cardStyle: React.CSSProperties = {
    border: isSelected ? '2px solid #007bff' : '1px solid #ddd',
    borderRadius: '8px',
    padding: '12px',
    margin: '8px',
    backgroundColor: isSold ? '#f8f9fa' : '#fff',
    opacity: isSold ? 0.7 : 1,
    cursor: onClick && !isSold ? 'pointer' : 'default',
    transition: 'all 0.2s ease',
    minWidth: '200px',
  };

  const handleClick = () => {
    if (onClick && !isSold) {
      onClick(player);
    }
  };

  /**
   * Handle keyboard accessibility.
   * 
   * WHY THIS MATTERS:
   * - Clickable elements should be keyboard accessible
   * - Shows attention to accessibility
   * - Good interview talking point
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div
      style={cardStyle}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick && !isSold ? 0 : undefined}
      aria-pressed={isSelected}
      aria-disabled={isSold}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong style={{ fontSize: '16px' }}>{player.name}</strong>
        <span>{getNationalityBadge(player.nationality)}</span>
      </div>

      {/* Role */}
      <div style={{ margin: '8px 0', color: '#666' }}>
        {getRoleEmoji(player.role)} {player.role}
      </div>

      {/* Base Price */}
      <div style={{ fontSize: '14px', color: '#28a745' }}>
        Base: ₹{player.basePrice}L
      </div>

      {/* Stats Summary */}
      <div style={{ fontSize: '12px', color: '#888', marginTop: '8px' }}>
        {player.stats.matches} matches
        {player.stats.battingAverage && ` • Bat: ${player.stats.battingAverage.toFixed(1)}`}
        {player.stats.bowlingAverage && ` • Bowl: ${player.stats.bowlingAverage.toFixed(1)}`}
      </div>

      {/* Sold Status */}
      {isSold && soldTo && soldPrice && (
        <div style={{ 
          marginTop: '8px', 
          padding: '4px 8px', 
          backgroundColor: '#dc3545', 
          color: '#fff',
          borderRadius: '4px',
          fontSize: '12px',
          textAlign: 'center',
        }}>
          SOLD to {soldTo} for ₹{soldPrice}L
        </div>
      )}
    </div>
  );
}

/**
 * React.memo wrapping.
 * 
 * WHY React.memo?
 * - PlayerCard receives complex props (player object)
 * - Multiple cards rendered in a list
 * - Without memo, all cards re-render when parent state changes
 * 
 * WHEN memo IS OVERKILL:
 * - Component renders rarely
 * - Props change on every render anyway
 * - Component is very simple (memo overhead > render cost)
 * 
 * HERE IT'S JUSTIFIED:
 * - Player list could have 50+ items
 * - Player objects don't change (immutable data)
 * - Card render is non-trivial (multiple divs, styles)
 */
export const PlayerCard = React.memo(PlayerCardComponent);

/**
 * TESTING NOTES:
 * 
 * This component is easy to test because it's pure:
 * 
 * ```tsx
 * const mockPlayer: Player = { ... };
 * 
 * // Test rendering
 * render(<PlayerCard player={mockPlayer} />);
 * expect(screen.getByText(mockPlayer.name)).toBeInTheDocument();
 * 
 * // Test click
 * const onClick = jest.fn();
 * render(<PlayerCard player={mockPlayer} onClick={onClick} />);
 * fireEvent.click(screen.getByRole('button'));
 * expect(onClick).toHaveBeenCalledWith(mockPlayer);
 * 
 * // Test sold state
 * render(<PlayerCard player={mockPlayer} isSold soldTo="Team A" soldPrice={100} />);
 * expect(screen.getByText(/SOLD/)).toBeInTheDocument();
 * ```
 */
