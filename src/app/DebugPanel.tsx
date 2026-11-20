import { useSyncExternalStore } from 'react'
import { getEvents, subscribe, summarize, type Stamped } from '@/lib/telemetry'
import styles from './DebugPanel.module.css'

function describe(e: Stamped): string {
  switch (e.type) {
    case 'api':
      return `${e.method} ${e.path} ${e.status ?? e.errorKind ?? ''} · ${e.durationMs}ms`
    case 'error':
      return `error ${e.component ? `[${e.component}] ` : ''}${e.name}: ${e.message}`
    case 'vital':
      return `${e.name} ${e.value}`
    case 'action':
      return `${e.name} → ${e.outcome}`
  }
}

/** `?debug=1` overlay (OPS-001). Lazy-loaded: never part of the normal bundle. */
export default function DebugPanel() {
  const events = useSyncExternalStore(subscribe, getEvents)
  const s = summarize(events)
  return (
    <aside className={styles.panel} aria-label="Telemetry">
      <p
        className={styles.summary}
      >{`${s.requests} req · ${Math.round(s.errorRate * 100)}% err · ${s.avgLatencyMs}ms avg`}</p>
      <ol className={styles.list}>
        {events
          .slice(-12)
          .reverse()
          .map((e) => (
            <li
              key={`${e.at}-${describe(e)}`}
              data-type={e.type}
              data-error={(e.type === 'api' && e.errorKind) || undefined}
            >
              {describe(e)}
            </li>
          ))}
      </ol>
    </aside>
  )
}
