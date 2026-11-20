/**
 * Single in-process event bus for observability (OPS-001). No dependencies.
 * Sinks: console in dev, the `?debug=1` panel. A production sink (sendBeacon / Sentry) plugs into `subscribe`.
 */
export type TelemetryEvent =
  | {
      type: 'api'
      method: string
      path: string
      status?: number
      durationMs: number
      errorKind?: string
    }
  | { type: 'error'; name: string; message: string; component?: string }
  | { type: 'vital'; name: 'LCP' | 'CLS' | 'INP'; value: number }
  | { type: 'action'; name: string; outcome: 'success' | 'failure' }

export type Stamped = TelemetryEvent & { at: number }

const MAX_EVENTS = 50
let events: readonly Stamped[] = []
const listeners = new Set<() => void>()

export function track(event: TelemetryEvent): void {
  // Privacy: never keep query strings — search keywords can contain personal data.
  const e =
    event.type === 'api' ? { ...event, path: event.path.split('?')[0] ?? event.path } : event
  events = [...events, { ...e, at: Date.now() }].slice(-MAX_EVENTS)
  if (import.meta.env.DEV && import.meta.env.MODE !== 'test') console.debug('[telemetry]', e)
  for (const l of listeners) l()
}

/** Snapshot is replaced (not mutated) on change → safe for useSyncExternalStore. */
export const getEvents = (): readonly Stamped[] => events

export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function resetTelemetry(): void {
  events = []
}

export function summarize(list: readonly Stamped[]) {
  const api = list.filter((e) => e.type === 'api')
  const errors = api.filter((e) => e.errorKind !== undefined).length
  const total = api.reduce((n, e) => n + e.durationMs, 0)
  return {
    requests: api.length,
    errors,
    errorRate: api.length ? errors / api.length : 0,
    avgLatencyMs: api.length ? Math.round(total / api.length) : 0,
  }
}
