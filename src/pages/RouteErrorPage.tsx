import { useEffect } from 'react'
import { Link, useRouteError } from 'react-router'
import { track } from '@/lib/telemetry'

/** Last-resort boundary for route-level failures (e.g. a lazy chunk failed to load after a deploy). */
export function RouteErrorPage() {
  const error = useRouteError()
  useEffect(() => {
    // reporting to an external sink is a side effect → effect, once per error
    const e = error instanceof Error ? error : new Error(String(error))
    track({ type: 'error', name: e.name, message: e.message, component: 'route' })
    if (import.meta.env.DEV) console.error(error)
  }, [error])
  return (
    <main id="main" className="container" style={{ paddingBlock: 'var(--space-8)' }}>
      <h1>頁面發生錯誤</h1>
      <p>
        請
        <button type="button" onClick={() => window.location.reload()}>
          重新整理
        </button>
        ，或<Link to="/">回到首頁</Link>。
      </p>
    </main>
  )
}
