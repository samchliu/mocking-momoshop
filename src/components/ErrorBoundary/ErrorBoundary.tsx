import { Component, type ErrorInfo, type ReactNode } from 'react'
import { track } from '@/lib/telemetry'

type Props = { children: ReactNode; fallback?: ReactNode; name?: string }
type State = { hasError: boolean }

/** Isolates failures per section so one broken block never blanks the whole page. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    track({ type: 'error', name: error.name, message: error.message, component: this.props.name })
    if (import.meta.env.DEV) console.error(`[${this.props.name ?? 'section'}]`, error, info)
  }

  render() {
    if (this.state.hasError) return this.props.fallback ?? null
    return this.props.children
  }
}
