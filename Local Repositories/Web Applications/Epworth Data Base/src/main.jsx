import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Error boundary class component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', fontFamily: 'Inter, sans-serif' }}>
          <h1 style={{ color: '#133c82' }}>Something went wrong</h1>
          <p style={{ color: '#666' }}>The application encountered an error. Please try refreshing the page.</p>
          <details style={{ marginTop: '10px', cursor: 'pointer' }}>
            <summary>Error Details</summary>
            <pre style={{ background: '#f5f5f5', padding: '10px', overflow: 'auto', fontSize: '12px' }}>
              {this.state.error?.toString()}
              {'\n\n'}
              {this.state.errorInfo?.componentStack}
            </pre>
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}

try {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>,
  );
} catch (error) {
  console.error('Render error:', error);
  document.getElementById('root').innerHTML = `
    <div style="padding: 20px; font-family: Inter, sans-serif;">
      <h1 style="color: #133c82;">Application Failed to Load</h1>
      <p style="color: #666;">Error: ${error?.message || 'Unknown error'}</p>
    </div>
  `;
}
