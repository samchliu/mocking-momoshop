import { useEffect } from 'react'
import { Link, useRouteError } from 'react-router'
import { Button } from '@/components'
import { track } from '@/lib/telemetry'
import styles from './Page.module.css'

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
    <main id="main" className={`container ${styles.simple}`}>
      <h1>頁面發生錯誤</h1>
      <p>
        請
        <Button variant="secondary" onClick={() => window.location.reload()}>
          重新整理
        </Button>
        ，或<Link to="/">回到首頁</Link>。
      </p>
    </main>
  )
}
