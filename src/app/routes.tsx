import { redirect, type LoaderFunctionArgs, type RouteObject } from 'react-router'
import { RouteErrorPage } from '@/pages/RouteErrorPage'
import { Layout } from './Layout'

const notFound = () => import('@/pages/NotFoundPage').then((m) => ({ Component: m.default }))

/** ADR-005: legacy URLs keep working — redirect when the id/keyword is present, otherwise 404. */
const legacy =
  (param: string, to: (v: string) => string) =>
  ({ request }: LoaderFunctionArgs) => {
    const v = new URL(request.url).searchParams.get(param)?.trim()
    return v ? redirect(to(encodeURIComponent(v))) : null
  }

/** Route-level code splitting: each page is its own chunk, loaded on navigation. */
export const routes: RouteObject[] = [
  {
    element: <Layout />,
    errorElement: <RouteErrorPage />,
    HydrateFallback: () => null,
    children: [
      {
        index: true,
        lazy: () => import('@/pages/HomePage').then((m) => ({ Component: m.default })),
      },
      // knowledge: REQ-002#AC7 — static segments outrank `:id`, so these win over the dynamic routes
      {
        path: 'goods/GoodsDetail.jsp',
        loader: legacy('i_code', (id) => `/goods/${id}`),
        lazy: notFound,
      },
      {
        path: 'search/searchShop.jsp',
        loader: legacy('keyword', (k) => `/search/${k}`),
        lazy: notFound,
      },
      {
        path: 'search/:keyword',
        lazy: () => import('@/pages/SearchPage').then((m) => ({ Component: m.default })),
      },
      {
        path: 'goods/:id',
        lazy: () => import('@/pages/GoodsPage').then((m) => ({ Component: m.default })),
      },
      {
        path: 'cart',
        lazy: () => import('@/pages/CartPage').then((m) => ({ Component: m.default })),
      },
      { path: '*', lazy: notFound },
    ],
  },
]
