/**
 * ValidationBanner - Displays validation messages and errors.
 * 
 * COMPONENT PURPOSE:
 * - Show success/error/warning messages
 * - Provide clear feedback on auction events
 * - Accessible announcements for screen readers
 * 
 * DESIGN DECISIONS:
 * - Simple presentational component
 * - Supports different message types (success, error, warning, info)
 * - Auto-dismissible or persistent based on type
 */

import React from 'react';

/**
 * Message types with associated styling.
 */
type MessageType = 'success' | 'error' | 'warning' | 'info';

type ValidationBannerProps = {
  message: string | null;
  type?: MessageType;
  onDismiss?: () => void;
};

/**
 * Get styles based on message type.
 */
function getTypeStyles(type: MessageType): {
  backgroundColor: string;
  borderColor: string;
  color: string;
  icon: string;
} {
  const styles: Record<MessageType, { backgroundColor: string; borderColor: string; color: string; icon: string }> = {
    success: {
      backgroundColor: '#d4edda',
      borderColor: '#28a745',
      color: '#155724',
      icon: '✓',
    },
    error: {
      backgroundColor: '#f8d7da',
      borderColor: '#dc3545',
      color: '#721c24',
      icon: '✕',
    },
    warning: {
      backgroundColor: '#fff3cd',
      borderColor: '#ffc107',
      color: '#856404',
      icon: '⚠',
    },
    info: {
      backgroundColor: '#cce5ff',
      borderColor: '#007bff',
      color: '#004085',
      icon: 'ℹ',
    },
  };
  return styles[type];
}

/**
 * ValidationBanner Component
 * 
 * ACCESSIBILITY:
 * - Uses role="alert" for important messages
 * - Screen readers will announce when message changes
 * - Dismissible with keyboard
 */
export function ValidationBanner({
  message,
  type = 'info',
  onDismiss,
}: ValidationBannerProps): React.ReactElement | null {
  // Don't render if no message
  if (!message) {
    return null;
  }

  const typeStyles = getTypeStyles(type);

  const bannerStyle: React.CSSProperties = {
    padding: '12px 16px',
    marginBottom: '16px',
    borderRadius: '8px',
    border: `1px solid ${typeStyles.borderColor}`,
    backgroundColor: typeStyles.backgroundColor,
    color: typeStyles.color,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  };

  const iconStyle: React.CSSProperties = {
    marginRight: '12px',
    fontSize: '18px',
    fontWeight: 'bold',
  };

  const dismissButtonStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    color: typeStyles.color,
    cursor: 'pointer',
    fontSize: '18px',
    padding: '4px 8px',
    marginLeft: '12px',
    opacity: 0.7,
  };

  /**
   * Determine ARIA role based on message type.
   * 
   * WHY DIFFERENT ROLES?
   * - "alert" for errors - immediately announced
   * - "status" for info - politely announced
   * - This follows ARIA best practices
   */
  const ariaRole = type === 'error' || type === 'warning' ? 'alert' : 'status';

  return (
    <div
      style={bannerStyle}
      role={ariaRole}
      aria-live={type === 'error' ? 'assertive' : 'polite'}
    >
      <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
        <span style={iconStyle} aria-hidden="true">
          {typeStyles.icon}
        </span>
        <span>{message}</span>
      </div>
      
      {onDismiss && (
        <button
          onClick={onDismiss}
          style={dismissButtonStyle}
          aria-label="Dismiss message"
        >
          ×
        </button>
      )}
    </div>
  );
}

/**
 * Helper component for displaying multiple validation errors.
 */
type ValidationErrorListProps = {
  errors: ReadonlyArray<{ message: string; code?: string }>;
  title?: string;
};

export function ValidationErrorList({
  errors,
  title = 'Please fix the following issues:',
}: ValidationErrorListProps): React.ReactElement | null {
  if (errors.length === 0) {
    return null;
  }

  const containerStyle: React.CSSProperties = {
    backgroundColor: '#f8d7da',
    border: '1px solid #dc3545',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '16px',
  };

  const titleStyle: React.CSSProperties = {
    color: '#721c24',
    marginTop: 0,
    marginBottom: '12px',
    fontSize: '16px',
    fontWeight: 'bold',
  };

  const listStyle: React.CSSProperties = {
    margin: 0,
    paddingLeft: '20px',
    color: '#721c24',
  };

  return (
    <div style={containerStyle} role="alert">
      <h4 style={titleStyle}>⚠️ {title}</h4>
      <ul style={listStyle}>
        {errors.map((error, index) => (
          <li key={error.code ?? index} style={{ marginBottom: '4px' }}>
            {error.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
