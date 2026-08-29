import React from 'react';
import { useAuth } from '../context/AuthContext';

export const ErrorBoundary = ({ children }) => {
  const [error, setError] = React.useState(null);

  if (error) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', background: '#F8FAFC',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        padding: 24,
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: 32, background: '#FEE2E2',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28, marginBottom: 16,
        }}>⚠️</div>
        <h2 style={{ margin: '0 0 8px', color: '#1F2937', fontSize: 20 }}>Something went wrong</h2>
        <p style={{ margin: '0 0 24px', color: '#6B7280', fontSize: 14, textAlign: 'center', maxWidth: 400 }}>
          {error.message || 'An unexpected error occurred. Please try refreshing the page.'}
        </p>
        <button
          onClick={() => { setError(null); window.location.reload(); }}
          style={{
            padding: '10px 24px', borderRadius: 8, border: 'none',
            background: '#059669', color: '#FFF', fontSize: 14,
            fontWeight: 600, cursor: 'pointer',
          }}
        >
          Refresh Page
        </button>
      </div>
    );
  }

  return (
    <ErrorCatcher onError={setError}>
      {children}
    </ErrorCatcher>
  );
};

class ErrorCatcher extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[RuVo Admin] Uncaught error:', error, errorInfo);
    if (this.props.onError) {
      this.props.onError(error);
    }
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}
