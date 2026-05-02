import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { error: Error | null }

/**
 * Top-level error boundary.
 * Catches render / lifecycle errors anywhere in the tree and shows a
 * plain recovery screen instead of a blank page.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught render error:', error, info.componentStack)
  }

  handleReload = () => {
    // Clear potentially corrupt localStorage keys before reloading
    try {
      ;['cs_user', 'cs_token'].forEach(k => localStorage.removeItem(k))
    } catch {}
    window.location.reload()
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div style={{
        position: 'fixed', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: '#f5f5f5', padding: 32, textAlign: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        gap: 16,
      }}>
        <div style={{ fontSize: 40, marginBottom: 4 }}>⚠️</div>
        <div style={{ fontSize: 20, fontWeight: 600, color: '#0b1220', letterSpacing: -0.4 }}>
          Something went wrong
        </div>
        <div style={{ fontSize: 14, color: '#666', lineHeight: 1.6, maxWidth: 280 }}>
          The app hit an unexpected error. Tap below to reload — your data is safe.
        </div>
        <button
          onClick={this.handleReload}
          style={{
            marginTop: 8, padding: '12px 28px',
            background: '#0b1220', color: '#fff',
            border: 'none', borderRadius: 12,
            fontSize: 15, fontWeight: 500, cursor: 'pointer',
          }}
        >
          Reload app
        </button>
        {import.meta.env.DEV && (
          <pre style={{
            marginTop: 16, fontSize: 11, color: '#999',
            maxWidth: 340, overflowX: 'auto', textAlign: 'left',
            background: '#fff', padding: 12, borderRadius: 8,
          }}>
            {this.state.error.message}
          </pre>
        )}
      </div>
    )
  }
}
