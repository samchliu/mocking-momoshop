import type { RouteObject } from 'react-router'
import { RouteErrorPage } from '@/pages/RouteErrorPage'
import { Layout } from './Layout'

/** Route-level code splitting: each page is its own chunk, loaded on navigation. */
export const routes: RouteObject[] = [
  {
    element: <Layout />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        index: true,
        lazy: () => import('@/pages/HomePage').then((m) => ({ Component: m.default })),
      },
      {
        path: '*',
        lazy: () => import('@/pages/NotFoundPage').then((m) => ({ Component: m.default })),
      },
    ],
  },
]
