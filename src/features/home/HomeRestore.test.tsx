import { act, render, screen } from '@testing-library/react'
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router'
import { request } from '@/api'
import type { HomeFeedResponse, ProductSummary } from '@/features/catalog'
import { useRouteTrail } from '@/hooks/useRouteTrail'
import { Providers } from '@/test/render'
import { HomeFeed } from './HomeFeed'
import {
  FEED_SNAPSHOT_KEY,
  parseFeedSnapshot,
  restorable,
  RESTORE_MAX_AGE_MS,
} from './feedSnapshot'

vi.mock('@/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api')>()),
  request: vi.fn<(typeof import('@/api'))['request']>(),
}))

const product = (i: number): ProductSummary => ({
  id: `F${i}`,
  brand: 'Brand',
  name: `商品 ${i}`,
  image: { src: 'data:image/svg+xml,', alt: '', width: 400, height: 400 },
  price: 1000 + i,
  tags: [],
  salesCount: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
})
const feedPage = (page: number): HomeFeedResponse => ({
  items: Array.from({ length: 20 }, (_, i) => product((page - 1) * 20 + i + 1)),
  page,
  pageSize: 20,
  totalPages: 5,
  total: 100,
})
const requested = () => vi.mocked(request).mock.calls.map(([path]) => String(path))
const flush = () => act(() => new Promise((r) => setTimeout(r, 20)))

let now = Date.UTC(2026, 10, 20, 12)

beforeEach(() => {
  sessionStorage.clear()
  // No IntersectionObserver → trigger zone counts as reached: the feed loads all 5 batches by itself.
  vi.stubGlobal('IntersectionObserver', undefined)
  vi.spyOn(Date, 'now').mockImplementation(() => now)
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  vi.mocked(request).mockReset()
  vi.mocked(request).mockImplementation(async (path: string) =>
    feedPage(Number(new URL(path, 'http://x').searchParams.get('page'))),
  )
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function Shell() {
  useRouteTrail()
  return <Outlet />
}

function renderApp() {
  const router = createMemoryRouter(
    [
      {
        element: <Shell />,
        children: [
          { path: '/', element: <HomeFeed /> },
          { path: '/goods/:id', element: <p>商品頁</p> },
          { path: '/search/:keyword', element: <p>搜尋頁</p> },
        ],
      },
    ],
    { initialEntries: ['/'] },
  )
  render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>,
  )
  return router
}

async function loadAll() {
  await vi.waitFor(() => expect(requested()).toHaveLength(5))
  await screen.findByRole('status', { name: '已經到底了' })
}
const go = async (router: ReturnType<typeof renderApp>, to: string | number) => {
  await act(() => (typeof to === 'number' ? router.navigate(to) : router.navigate(to)))
  await flush()
}

/** Requests made after the first 5 — the feed after returning home (here, all 5 again). */
async function refetched() {
  await vi.waitFor(() => expect(requested()).toHaveLength(10))
  return requested().slice(5)
}
const FROM_PAGE_1 = [1, 2, 3, 4, 5].map((p) => `/api/home/feed?page=${p}`)

describe('home feed restore (REQ-005#AC11)', () => {
  it('REQ-005#AC11 從商品頁返回、30 分鐘內：不重新請求，已載入的批與到底狀態都還在', async () => {
    const router = renderApp()
    await loadAll()
    await go(router, '/goods/F7')
    expect(screen.getByText('商品頁')).toBeInTheDocument()

    now += RESTORE_MAX_AGE_MS - 1
    await go(router, -1)
    expect(screen.getByRole('list', { name: '推薦商品' })).toBeInTheDocument()
    expect(screen.getByRole('status', { name: '已經到底了' })).toBeInTheDocument()
    expect(requested()).toHaveLength(5)
    // the anchor product is scrolled back below the header
    expect(window.scrollTo).toHaveBeenCalled()
  })

  it('REQ-005#AC11 商品頁之間往返後再返回首頁，仍視為從商品頁返回', async () => {
    const router = renderApp()
    await loadAll()
    await go(router, '/goods/F7')
    await go(router, '/goods/F8')
    await go(router, -1)
    await go(router, -1)
    expect(requested()).toHaveLength(5)
  })

  it('REQ-005#AC11 ≥ 30 分鐘：捨棄並重新請求 page=1', async () => {
    const router = renderApp()
    await loadAll()
    await go(router, '/goods/F7')
    now += RESTORE_MAX_AGE_MS
    await go(router, -1)
    expect(await refetched()).toEqual(FROM_PAGE_1)
  })

  it('REQ-005#AC11 從商品頁以外的頁面返回：重新請求 page=1', async () => {
    const router = renderApp()
    await loadAll()
    await go(router, '/goods/F7')
    await go(router, '/search/iphone')
    await go(router, -2)
    expect(await refetched()).toEqual(FROM_PAGE_1)
  })

  it('REQ-005#AC11 從站內連結（含 logo）進入首頁：重新請求 page=1', async () => {
    const router = renderApp()
    await loadAll()
    await go(router, '/goods/F7')
    await go(router, '/')
    expect(await refetched()).toEqual(FROM_PAGE_1)
  })

  it('REQ-005#AC11 狀態存在 sessionStorage；格式不符時視為沒有', async () => {
    const router = renderApp()
    await loadAll()
    await go(router, '/goods/F7')
    const saved = parseFeedSnapshot(JSON.parse(sessionStorage.getItem(FEED_SNAPSHOT_KEY) ?? 'null'))
    expect(saved.pages.map((p) => p.page)).toEqual([1, 2, 3, 4, 5])

    sessionStorage.setItem(FEED_SNAPSHOT_KEY, '{"pages":"oops"}')
    await go(router, -1)
    expect(await refetched()).toEqual(FROM_PAGE_1)
  })
})

describe('restorable (REQ-005#AC11)', () => {
  const snap = { savedAt: 1_000, anchor: 0, pages: [feedPage(1)] }
  const ok = { navigationType: 'POP', from: '/goods/F1', now: 1_000, reloadedSinceSave: false }

  it('REQ-005#AC11 只有 POP、上一頁是商品頁、未滿 30 分鐘、未重新整理時才還原', () => {
    expect(restorable(snap, ok)).toBe(true)
    expect(restorable(snap, { ...ok, now: 1_000 + RESTORE_MAX_AGE_MS - 1 })).toBe(true)
    expect(restorable(snap, { ...ok, now: 1_000 + RESTORE_MAX_AGE_MS })).toBe(false)
    expect(restorable(snap, { ...ok, navigationType: 'PUSH' })).toBe(false)
    expect(restorable(snap, { ...ok, navigationType: 'REPLACE' })).toBe(false)
    expect(restorable(snap, { ...ok, from: '/search/iphone' })).toBe(false)
    expect(restorable(snap, { ...ok, from: undefined })).toBe(false)
    expect(restorable(snap, { ...ok, reloadedSinceSave: true })).toBe(false)
    expect(restorable(snap, { ...ok, now: 999 })).toBe(false)
    expect(restorable({ ...snap, pages: [] }, ok)).toBe(false)
  })
})
