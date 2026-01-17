import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

/**
 * Application entry point.
 * 
 * STRICT MODE:
 * React.StrictMode is enabled to catch:
 * - Unsafe lifecycle methods
 * - Legacy string refs
 * - Unexpected side effects
 * - Deprecated APIs
 * 
 * Note: StrictMode double-invokes certain functions (effects, reducers)
 * to help detect side effects. This is intentional and only happens
 * in development.
 */
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
