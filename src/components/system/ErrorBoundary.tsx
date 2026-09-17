import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
  /** bumped by Retry to force a fresh mount of the subtree */
  attempt: number
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, attempt: 0 }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Keep a real trace in the console — a blank screen with zero evidence
    // is the worst outcome. This also helps future telemetry if ever added.
    console.error('[AU_] render error:', error, info.componentStack)
  }

  private retry = () => this.setState((s) => ({ error: null, attempt: s.attempt + 1 }))

  render() {
    if (this.state.error) {
      return (
        <div
          role="alert"
          style={{
            minHeight: '100dvh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 18,
            padding: 24,
            textAlign: 'center',
          }}
        >
          <div className="au-loader" aria-hidden="true">AU_</div>
          <h1 style={{ fontFamily: 'var(--f-display)', fontSize: 'clamp(2.4rem,6vw,4rem)', lineHeight: 1, margin: 0 }}>
            Something <em style={{ fontFamily: 'var(--f-serif)', fontStyle: 'italic', color: 'var(--lime)' }}>broke</em>.
          </h1>
          <p style={{ fontFamily: 'var(--f-mono)', fontSize: 12, color: 'var(--dim)', letterSpacing: '0.08em', maxWidth: 46 }}>
            UNEXPECTED ERROR WHILE RENDERING THIS PAGE.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button className="btn-lime" onClick={this.retry}>Try again</button>
            <button className="btn-ghost-line" onClick={() => window.location.assign('/')}>Go home</button>
          </div>
        </div>
      )
    }
    // key forces a remount of the subtree on retry so a half-mounted tree
    // from the failed attempt never lingers.
    return <div key={this.state.attempt} style={{ display: 'contents' }}>{this.props.children}</div>
  }
}
