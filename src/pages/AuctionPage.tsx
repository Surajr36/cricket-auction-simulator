/**
 * AuctionPage - Main page component that orchestrates the auction.
 * 
 * ARCHITECTURE ROLE:
 * - Composes all components together
 * - Manages top-level state via useAuction hook
 * - Passes data and callbacks down to children
 * 
 * WHY A "PAGE" COMPONENT?
 * - Clear entry point for the feature
 * - Separates routing concerns (if added later)
 * - Single place to wire up all the pieces
 * 
 * PROP DRILLING vs CONTEXT:
 * We use prop drilling here instead of Context because:
 * 1. Component tree is shallow (only 2-3 levels)
 * 2. Props are explicit - you can trace data flow
 * 3. Context would cause unnecessary re-renders
 * 4. Easier to test components in isolation
 * 
 * WHEN TO USE CONTEXT:
 * - Deep trees (5+ levels)
 * - Truly global data (theme, auth user)
 * - When prop drilling becomes painful
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Team, Player } from '../domain/types';
import { useAuction } from '../hooks/useAuction';
import { useAuctionTimer } from '../hooks/useAuctionTimer';
import { useAIRecommendation } from '../hooks/useAIRecommendation';
import { AuctionTable } from '../components/AuctionTable';
import { BidControls } from '../components/BidControls';
import { SquadSummary } from '../components/SquadSummary';
import { ValidationBanner } from '../components/ValidationBanner';
import { PlayerCard } from '../components/PlayerCard';

type AuctionPageProps = {
  teams: Team[];
  players: Player[];
};

/**
 * AuctionPage Component
 * 
 * STATE SOURCES:
 * 1. useAuction: Domain state (auction phases, bids, teams)
 * 2. useAuctionTimer: Timer state (time remaining)
 * 3. useState: UI state (selected team, expanded panels)
 * 
 * WHY MULTIPLE STATE SOURCES?
 * - Different concerns have different update frequencies
 * - Separating them prevents unnecessary re-renders
 * - Each hook is independently testable
 */
export function AuctionPage({ teams, players }: AuctionPageProps): React.ReactElement {
  // Core auction state and actions
  const { state, actions, queries } = useAuction({ teams, players });

  // Timer management (calls actions.tick and actions.handleTimeExpired)
  const { timeRemaining, isRunning } = useAuctionTimer({
    state,
    onTick: actions.tick,
    onExpired: actions.handleTimeExpired,
  });

  // UI state: which team is currently placing bids
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  // UI state: expanded squad summaries
  const [expandedTeamIds, setExpandedTeamIds] = useState<Set<string>>(new Set());

  // Get selected team's state for AI recommendations
  const selectedTeamState = useMemo(() => {
    if (!selectedTeamId) return null;
    return state.teams.find(t => t.teamId === selectedTeamId) ?? null;
  }, [selectedTeamId, state.teams]);

  // AI recommendation for current player and selected team
  const { recommendation, shouldBid, skipReason } = useAIRecommendation({
    player: state.phase === 'bidding' ? state.currentPlayer : null,
    teamState: selectedTeamState,
    allPlayers: players,
    currentBid: state.phase === 'bidding' ? state.currentBid?.amount ?? null : null,
    isEnabled: selectedTeamId !== null,
  });

  /**
   * Derived data: sold player info for display.
   * 
   * This transforms team squad data into a flat list of sold players.
   */
  const soldPlayerInfo = useMemo(() => {
    return state.teams.flatMap(team =>
      team.squad.map(acquired => ({
        playerId: acquired.playerId,
        teamId: team.teamId,
        price: acquired.purchasePrice,
      }))
    );
  }, [state.teams]);

  /**
   * Toggle team summary expansion.
   */
  const toggleTeamExpand = useCallback((teamId: string) => {
    setExpandedTeamIds(prev => {
      const next = new Set(prev);
      if (next.has(teamId)) {
        next.delete(teamId);
      } else {
        next.add(teamId);
      }
      return next;
    });
  }, []);

  /**
   * Handle player selection to start bidding.
   */
  const handleSelectPlayer = useCallback((player: Player) => {
    if (state.phase === 'idle') {
      actions.startBidding(player);
    }
  }, [state.phase, actions]);

  /**
   * Handle "next player" after sold/unsold state.
   */
  const handleNextPlayer = useCallback(() => {
    actions.resetToIdle();
  }, [actions]);

  // Styles
  const pageStyle: React.CSSProperties = {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  };

  const headerStyle: React.CSSProperties = {
    textAlign: 'center',
    marginBottom: '24px',
  };

  const layoutStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '280px 1fr',
    gap: '24px',
  };

  const sidebarStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
  };

  const mainStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
  };

  /**
   * Render current bidding panel.
   */
  const renderBiddingPanel = () => {
    if (state.phase !== 'bidding') {
      return null;
    }

    return (
      <div style={{
        border: '2px solid #007bff',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '24px',
        backgroundColor: '#f8f9fa',
      }}>
        <h3 style={{ marginTop: 0 }}>🔨 Now Bidding</h3>
        
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          {/* Current Player */}
          <div style={{ flex: '0 0 auto' }}>
            <PlayerCard
              player={state.currentPlayer}
              isSelected
            />
          </div>

          {/* Bid Controls */}
          <div style={{ flex: 1, minWidth: '300px' }}>
            <BidControls
              teams={teams}
              currentBidAmount={state.currentBid?.amount ?? null}
              minimumBid={queries.getMinBid() ?? state.currentPlayer.basePrice}
              timeRemaining={timeRemaining}
              selectedTeamId={selectedTeamId}
              canTeamAfford={queries.canTeamAfford}
              recommendation={shouldBid ? recommendation : null}
              onPlaceBid={actions.placeBid}
              onPass={actions.passPlayer}
              onSelectTeam={setSelectedTeamId}
            />
            
            {/* Skip reason if AI doesn't recommend */}
            {!shouldBid && skipReason && selectedTeamId && (
              <div style={{
                fontSize: '12px',
                color: '#dc3545',
                padding: '8px',
                backgroundColor: '#fff5f5',
                borderRadius: '4px',
                marginTop: '8px',
              }}>
                ℹ️ AI Note: {skipReason}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  /**
   * Render sold/unsold result panel.
   */
  const renderResultPanel = () => {
    if (state.phase === 'sold') {
      const buyingTeam = teams.find(t => t.id === state.winningBid.teamId);
      
      return (
        <div style={{
          border: '2px solid #28a745',
          borderRadius: '8px',
          padding: '24px',
          marginBottom: '24px',
          backgroundColor: '#d4edda',
          textAlign: 'center',
        }}>
          <h2 style={{ color: '#155724', margin: '0 0 16px 0' }}>
            🎉 SOLD!
          </h2>
          <p style={{ fontSize: '18px', margin: '0 0 8px 0' }}>
            <strong>{state.soldPlayer.name}</strong>
          </p>
          <p style={{ fontSize: '16px', margin: '0 0 16px 0' }}>
            to <strong>{buyingTeam?.name ?? state.winningBid.teamId}</strong>
          </p>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#155724', margin: '0 0 16px 0' }}>
            ₹{state.winningBid.amount}L
          </p>
          <button
            onClick={handleNextPlayer}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              backgroundColor: '#28a745',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Next Player →
          </button>
        </div>
      );
    }

    if (state.phase === 'unsold') {
      return (
        <div style={{
          border: '2px solid #dc3545',
          borderRadius: '8px',
          padding: '24px',
          marginBottom: '24px',
          backgroundColor: '#f8d7da',
          textAlign: 'center',
        }}>
          <h2 style={{ color: '#721c24', margin: '0 0 16px 0' }}>
            😔 UNSOLD
          </h2>
          <p style={{ fontSize: '18px', margin: '0 0 16px 0' }}>
            <strong>{state.unsoldPlayer.name}</strong> received no bids
          </p>
          <button
            onClick={handleNextPlayer}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              backgroundColor: '#dc3545',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Next Player →
          </button>
        </div>
      );
    }

    return null;
  };

  /**
   * Render idle state instructions.
   */
  const renderIdleInstructions = () => {
    if (state.phase !== 'idle') {
      return null;
    }

    const remainingPlayers = queries.getRemainingPlayers();

    if (remainingPlayers.length === 0) {
      return (
        <div style={{
          border: '2px solid #28a745',
          borderRadius: '8px',
          padding: '24px',
          marginBottom: '24px',
          backgroundColor: '#d4edda',
          textAlign: 'center',
        }}>
          <h2 style={{ color: '#155724' }}>🏆 Auction Complete!</h2>
          <p>All players have been auctioned.</p>
        </div>
      );
    }

    return (
      <div style={{
        border: '1px solid #007bff',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '24px',
        backgroundColor: '#cce5ff',
        textAlign: 'center',
      }}>
        <p style={{ margin: 0, color: '#004085' }}>
          👆 Click on an available player below to start bidding
        </p>
      </div>
    );
  };

  return (
    <div style={pageStyle}>
      {/* Header */}
      <header style={headerStyle}>
        <h1 style={{ margin: '0 0 8px 0' }}>🏏 Cricket Auction Simulator</h1>
        <p style={{ margin: 0, color: '#666' }}>
          T20 Team Auction with AI-Assisted Bidding
        </p>
      </header>

      {/* Status Message */}
      <ValidationBanner
        message={state.message}
        type={
          state.phase === 'sold' ? 'success' :
          state.phase === 'unsold' ? 'warning' :
          'info'
        }
      />

      {/* Main Layout */}
      <div style={layoutStyle}>
        {/* Sidebar: Team Summaries */}
        <aside style={sidebarStyle}>
          <h3 style={{ marginTop: 0 }}>Teams</h3>
          {teams.map(team => {
            const teamState = state.teams.find(t => t.teamId === team.id);
            if (!teamState) return null;
            
            return (
              <SquadSummary
                key={team.id}
                team={team}
                teamState={teamState}
                allPlayers={players}
                isExpanded={expandedTeamIds.has(team.id)}
                onToggleExpand={() => toggleTeamExpand(team.id)}
              />
            );
          })}
        </aside>

        {/* Main Content */}
        <main style={mainStyle}>
          {/* Idle Instructions */}
          {renderIdleInstructions()}

          {/* Active Bidding Panel */}
          {renderBiddingPanel()}

          {/* Result Panel */}
          {renderResultPanel()}

          {/* Player Pool */}
          <AuctionTable
            players={players}
            completedPlayerIds={state.completedPlayerIds}
            soldPlayerInfo={soldPlayerInfo}
            currentPlayerId={state.phase === 'bidding' ? state.currentPlayer.id : null}
            onSelectPlayer={handleSelectPlayer}
          />
        </main>
      </div>
    </div>
  );
}
