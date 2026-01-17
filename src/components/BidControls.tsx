/**
 * BidControls - UI for placing bids during active auction.
 * 
 * COMPONENT RESPONSIBILITIES:
 * - Show current bid amount input
 * - Provide quick-bid buttons for common increments
 * - Display validation errors
 * - Show AI recommendation (optional)
 * 
 * STATE MANAGEMENT:
 * - Local state for bid input (controlled component)
 * - Receives auction state and actions via props
 * - Doesn't manage auction state directly
 * 
 * WHY LOCAL STATE FOR INPUT?
 * - Input state is UI-specific, not domain state
 * - Keeps reducer focused on domain transitions
 * - Allows validation before submitting to reducer
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Team, BidRecommendation } from '../domain/types';
import { getSuggestedBidIncrements } from '../domain/auctionRules';

/**
 * Props with explicit types.
 */
type BidControlsProps = {
  teams: Team[];
  currentBidAmount: number | null;
  minimumBid: number;
  timeRemaining: number;
  selectedTeamId: string | null;
  canTeamAfford: (teamId: string, amount: number) => boolean;
  recommendation: BidRecommendation | null;
  onPlaceBid: (teamId: string, amount: number) => void;
  onPass: () => void;
  onSelectTeam: (teamId: string) => void;
};

/**
 * BidControls Component
 * 
 * INTERVIEW TALKING POINTS:
 * 1. Controlled inputs - React manages input state
 * 2. Derived state - suggested increments computed from current bid
 * 3. Validation - checks before calling onPlaceBid
 * 4. Accessibility - labels, disabled states, ARIA attributes
 */
export function BidControls({
  teams,
  currentBidAmount,
  minimumBid,
  timeRemaining,
  selectedTeamId,
  canTeamAfford,
  recommendation,
  onPlaceBid,
  onPass,
  onSelectTeam,
}: BidControlsProps): React.ReactElement {
  /**
   * Local state for custom bid amount.
   * 
   * WHY useState HERE?
   * - This is UI state, not domain state
   * - Only this component cares about it
   * - Doesn't need to be in the reducer
   */
  const [customBidAmount, setCustomBidAmount] = useState<string>(
    minimumBid.toString()
  );
  const [error, setError] = useState<string | null>(null);

  /**
   * Derived value: suggested bid increments.
   * 
   * useMemo IS JUSTIFIED here:
   * - Calculation depends on currentBidAmount
   * - Result is used to render buttons
   * - Prevents recalculation on unrelated re-renders
   */
  const suggestedIncrements = useMemo(() => {
    const baseAmount = currentBidAmount ?? minimumBid;
    return getSuggestedBidIncrements(baseAmount);
  }, [currentBidAmount, minimumBid]);

  /**
   * Handle team selection.
   * 
   * useCallback IS JUSTIFIED:
   * - Function is passed to child elements (option onClick)
   * - Prevents recreation on every render
   */
  const handleTeamSelect = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onSelectTeam(e.target.value);
    setError(null);
  }, [onSelectTeam]);

  /**
   * Validate and submit bid.
   */
  const handleBid = useCallback((amount: number) => {
    if (!selectedTeamId) {
      setError('Please select a team first');
      return;
    }

    if (amount < minimumBid) {
      setError(`Bid must be at least ₹${minimumBid}L`);
      return;
    }

    if (!canTeamAfford(selectedTeamId, amount)) {
      setError('Team cannot afford this bid');
      return;
    }

    setError(null);
    onPlaceBid(selectedTeamId, amount);
    
    // Update custom input to new minimum
    const newMin = amount + 5;
    setCustomBidAmount(newMin.toString());
  }, [selectedTeamId, minimumBid, canTeamAfford, onPlaceBid]);

  /**
   * Handle quick-bid button clicks.
   */
  const handleQuickBid = useCallback((increment: number) => {
    const baseAmount = currentBidAmount ?? minimumBid;
    const newAmount = baseAmount + increment;
    handleBid(newAmount);
  }, [currentBidAmount, minimumBid, handleBid]);

  /**
   * Handle custom bid submission.
   */
  const handleCustomBid = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseInt(customBidAmount, 10);
    
    if (isNaN(amount)) {
      setError('Please enter a valid number');
      return;
    }

    handleBid(amount);
  }, [customBidAmount, handleBid]);

  /**
   * Handle AI recommendation accept.
   */
  const handleAcceptRecommendation = useCallback(() => {
    if (recommendation) {
      handleBid(recommendation.recommendedMaxBid);
    }
  }, [recommendation, handleBid]);

  // Styles
  const containerStyle: React.CSSProperties = {
    padding: '16px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    backgroundColor: '#f8f9fa',
    marginBottom: '16px',
  };

  const timerStyle: React.CSSProperties = {
    fontSize: '32px',
    fontWeight: 'bold',
    textAlign: 'center',
    color: timeRemaining <= 10 ? '#dc3545' : '#333',
    marginBottom: '16px',
  };

  const buttonStyle: React.CSSProperties = {
    padding: '8px 16px',
    margin: '4px',
    borderRadius: '4px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
  };

  const primaryButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: '#007bff',
    color: '#fff',
  };

  const secondaryButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: '#6c757d',
    color: '#fff',
  };

  return (
    <div style={containerStyle}>
      {/* Timer Display */}
      <div style={timerStyle}>
        ⏱️ {timeRemaining}s
      </div>

      {/* Current Bid Info */}
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        {currentBidAmount !== null ? (
          <span style={{ fontSize: '24px', color: '#28a745' }}>
            Current Bid: ₹{currentBidAmount}L
          </span>
        ) : (
          <span style={{ fontSize: '18px', color: '#666' }}>
            No bids yet. Minimum: ₹{minimumBid}L
          </span>
        )}
      </div>

      {/* Team Selection */}
      <div style={{ marginBottom: '16px' }}>
        <label htmlFor="team-select" style={{ display: 'block', marginBottom: '4px' }}>
          Select Team:
        </label>
        <select
          id="team-select"
          value={selectedTeamId ?? ''}
          onChange={handleTeamSelect}
          style={{
            width: '100%',
            padding: '8px',
            borderRadius: '4px',
            border: '1px solid #ddd',
          }}
        >
          <option value="">-- Select a team --</option>
          {teams.map(team => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      </div>

      {/* Quick Bid Buttons */}
      <div style={{ marginBottom: '16px', textAlign: 'center' }}>
        <p style={{ margin: '0 0 8px 0', color: '#666' }}>Quick Bid:</p>
        {suggestedIncrements.map(increment => (
          <button
            key={increment}
            onClick={() => handleQuickBid(increment)}
            style={primaryButtonStyle}
            disabled={!selectedTeamId}
            aria-label={`Bid plus ${increment} lakhs`}
          >
            +₹{increment}L
          </button>
        ))}
      </div>

      {/* Custom Bid Input */}
      <form onSubmit={handleCustomBid} style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <label htmlFor="custom-bid" style={{ whiteSpace: 'nowrap' }}>
            Custom Bid:
          </label>
          <input
            id="custom-bid"
            type="number"
            value={customBidAmount}
            onChange={e => setCustomBidAmount(e.target.value)}
            min={minimumBid}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #ddd',
            }}
            aria-describedby={error ? 'bid-error' : undefined}
          />
          <span style={{ color: '#666' }}>L</span>
          <button
            type="submit"
            style={primaryButtonStyle}
            disabled={!selectedTeamId}
          >
            Bid
          </button>
        </div>
      </form>

      {/* Error Display */}
      {error && (
        <div
          id="bid-error"
          role="alert"
          style={{
            color: '#dc3545',
            backgroundColor: '#f8d7da',
            padding: '8px 12px',
            borderRadius: '4px',
            marginBottom: '16px',
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* AI Recommendation */}
      {recommendation && (
        <div style={{
          backgroundColor: '#e7f5ff',
          border: '1px solid #339af0',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '16px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong>🤖 AI Recommendation</strong>
            <span style={{
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              backgroundColor: recommendation.confidence === 'high' ? '#51cf66' :
                              recommendation.confidence === 'medium' ? '#fcc419' : '#ff6b6b',
              color: '#fff',
            }}>
              {recommendation.confidence} confidence
            </span>
          </div>
          <p style={{ margin: '8px 0' }}>
            Recommended max bid: <strong>₹{recommendation.recommendedMaxBid}L</strong>
          </p>
          <details style={{ fontSize: '12px', color: '#666' }}>
            <summary style={{ cursor: 'pointer' }}>View reasoning</summary>
            <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
              {recommendation.reasoning.map((factor, i) => (
                <li key={i}>
                  <strong>{factor.factor}</strong> ({factor.impact}): {factor.explanation}
                </li>
              ))}
            </ul>
          </details>
          <button
            onClick={handleAcceptRecommendation}
            style={{
              ...primaryButtonStyle,
              width: '100%',
              marginTop: '8px',
            }}
            disabled={!selectedTeamId}
          >
            Bid ₹{recommendation.recommendedMaxBid}L
          </button>
        </div>
      )}

      {/* Pass Button */}
      <div style={{ textAlign: 'center' }}>
        <button
          onClick={onPass}
          style={secondaryButtonStyle}
          aria-label="Pass on this player"
        >
          Pass (No Bid)
        </button>
      </div>
    </div>
  );
}

/**
 * NOTE: This component is NOT wrapped in React.memo.
 * 
 * WHY NOT?
 * - It receives callback props that may change frequently
 * - The time changes every second, so it re-renders anyway
 * - Memo overhead wouldn't provide benefit here
 * 
 * This is an example of where memoization is NOT needed.
 */
