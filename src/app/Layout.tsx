import { lazy, Suspense } from 'react'
import { Outlet, ScrollRestoration } from 'react-router'
import { OfflineBanner } from '@/components'
import { SiteHeader } from './SiteHeader'

const DebugPanel = lazy(() => import('./DebugPanel'))
// Read once: the panel is a developer/demo tool switched on by `?debug=1` (OPS-001).
const DEBUG =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === '1'

export function Layout() {
  return (
    <>
      <a className="skip-link" href="#main">
        跳到主要內容
      </a>
      <OfflineBanner />
      <header className="site-header">
        <SiteHeader />
      </header>
      <main id="main" tabIndex={-1}>
        <Outlet />
      </main>
      <footer>{/* <SiteFooter /> */}</footer>
      <ScrollRestoration />
      {DEBUG && (
        <Suspense fallback={null}>
          <DebugPanel />
        </Suspense>
      )}
    </>
  )
}
