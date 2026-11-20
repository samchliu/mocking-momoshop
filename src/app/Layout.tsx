import { Outlet, ScrollRestoration } from 'react-router'
import { OfflineBanner } from '@/components'
import { SiteHeader } from './SiteHeader'

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
    </>
  )
}
