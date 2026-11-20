/* eslint-disable react/only-export-components -- test-only module, never hot-reloaded */
import { QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router'
import { routes as appRoutes } from '@/app/routes'
import { createQueryClient } from '@/app/queryClient'
import { ToastProvider } from '@/components'
import { CartProvider } from '@/features/cart'

/** All app providers, with a fresh QueryClient (no retries) per test. */
export function Providers({ children }: { children: ReactNode }) {
  const client = createQueryClient()
  client.setDefaultOptions({ queries: { ...client.getDefaultOptions().queries, retry: false } })
  return (
    <QueryClientProvider client={client}>
      <ToastProvider>
        <CartProvider>{children}</CartProvider>
      </ToastProvider>
    </QueryClientProvider>
  )
}

/** Render a path through the real route table (or custom routes) in a memory router. */
export function renderRoute(path: string, routes: RouteObject[] = appRoutes) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  const utils = render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>,
  )
  return { ...utils, router }
}

/** Make the mock backend respond instantly in tests (fault-injection params live in window.location). */
export function fastMock() {
  window.history.replaceState(null, '', '/?latency=0')
}
