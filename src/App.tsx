/**
 * App - Root component that loads data and renders the auction page.
 * 
 * RESPONSIBILITIES:
 * - Load data (from API or fallback to static)
 * - Handle loading/error states
 * - Render the main page component
 * 
 * WHY NOT LOAD DATA IN AuctionPage?
 * - Separation of concerns: App handles data loading, AuctionPage handles auction
 * - Easier to swap data sources (API vs static) without changing auction logic
 * - Clear boundary for where data comes from
 * 
 * DATA LOADING STRATEGY:
 * 1. Try to fetch from backend API (localhost:8080)
 * 2. If API unavailable, fall back to static JSON files
 * This allows the app to work with or without the backend running.
 */

import React from 'react';
import { AuctionPage } from './pages/AuctionPage';
import { Player, Team } from './domain/types';
import { useAuctionData } from './hooks/useAuctionData';

// Import static data as fallback
import playersData from './data/players.json';
import teamsData from './data/teams.json';

/**
 * App Component
 * 
 * Uses the useAuctionData hook to fetch from the backend API.
 * Falls back to static JSON if the API is unavailable.
 */
function App(): React.ReactElement {
  // Try to load from API
  const { players: apiPlayers, teams: apiTeams, loadingState, error, refetch } = useAuctionData();

  // Fallback to static data if API fails
  const players = loadingState === 'success' && apiPlayers.length > 0
    ? apiPlayers
    : playersData as Player[];
    
  const teams = loadingState === 'success' && apiTeams.length > 0
    ? apiTeams
    : teamsData as Team[];

  // Show loading state
  const isLoading = loadingState === 'loading';
  
  // Determine data source for display
  const dataSource = loadingState === 'success' && apiPlayers.length > 0 
    ? 'API' 
    : 'Static JSON';

  return (
    <div>
      {/* Global styles */}
      <style>{`
        * {
          box-sizing: border-box;
        }
        
        body {
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 
                       Oxygen, Ubuntu, Cantarell, 'Fira Sans', 'Droid Sans', 
                       'Helvetica Neue', sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          background-color: #f5f5f5;
          min-height: 100vh;
        }
        
        button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        button:not(:disabled):hover {
          opacity: 0.9;
        }
        
        select:focus, input:focus, button:focus {
          outline: 2px solid #007bff;
          outline-offset: 2px;
        }
        
        .loading-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(255, 255, 255, 0.9);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        
        .loading-spinner {
          width: 50px;
          height: 50px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #007bff;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .data-source-badge {
          position: fixed;
          bottom: 10px;
          right: 10px;
          padding: 8px 16px;
          border-radius: 4px;
          font-size: 12px;
          z-index: 100;
        }
        
        .error-banner {
          background: #fff3cd;
          border: 1px solid #ffc107;
          padding: 12px 16px;
          margin-bottom: 16px;
          border-radius: 4px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
      `}</style>
      
      {/* Loading Overlay */}
      {isLoading && (
        <div className="loading-overlay">
          <div>
            <div className="loading-spinner"></div>
            <p style={{ marginTop: '16px', color: '#666' }}>Loading auction data...</p>
          </div>
        </div>
      )}
      
      {/* Error Banner (non-blocking - we have fallback data) */}
      {error && !isLoading && (
        <div className="error-banner">
          <span>⚠️ Could not connect to backend API. Using static data.</span>
          <button 
            onClick={refetch}
            style={{
              padding: '4px 12px',
              cursor: 'pointer',
              border: '1px solid #ffc107',
              borderRadius: '4px',
              background: 'white',
            }}
          >
            Retry
          </button>
        </div>
      )}
      
      {/* Main Application */}
      <AuctionPage teams={teams} players={players} />
      
      {/* Data Source Badge */}
      <div 
        className="data-source-badge"
        style={{
          background: dataSource === 'API' ? '#d4edda' : '#e2e3e5',
          border: `1px solid ${dataSource === 'API' ? '#28a745' : '#6c757d'}`,
        }}
      >
        Data: {dataSource}
      </div>
    </div>
  );
}

export default App;
