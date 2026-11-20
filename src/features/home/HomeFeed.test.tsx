import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { ApiError, request } from '@/api'
import type { HomeFeedResponse, ProductSummary } from '@/features/catalog'
import { Providers } from '@/test/render'
import { HomeFeed } from './HomeFeed'

vi.mock('@/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api')>()),
  request: vi.fn<(typeof import('@/api'))['request']>(),
}))

// --- controllable backend --------------------------------------------------------------------
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
const feedPage = (page: number, overrides: Partial<HomeFeedResponse> = {}): HomeFeedResponse => ({
  items: Array.from({ length: 20 }, (_, i) => product((page - 1) * 20 + i + 1)),
  page,
  pageSize: 20,
  totalPages: 5,
  total: 100,
  ...overrides,
})

type Pending = {
  page: number
  resolve: (v: HomeFeedResponse) => void
  reject: (e: unknown) => void
}
let pending: Pending[] = []
const requested = () => vi.mocked(request).mock.calls.map(([path]) => String(path))

/** Let TanStack Query's batched notifications (scheduled with setTimeout) reach React. */
const flush = () => act(() => new Promise((r) => setTimeout(r, 20)))

async function settle(fn: (p: Pending) => void) {
  await vi.waitFor(() => expect(pending.length).toBeGreaterThan(0))
  const p = pending.shift()!
  await act(async () => fn(p))
  await flush()
}
const respond = (overrides?: Partial<HomeFeedResponse>) =>
  settle((p) => p.resolve(feedPage(p.page, overrides)))
const fail = (error: unknown) => settle((p) => p.reject(error))

// --- controllable IntersectionObserver (trigger zone) -----------------------------------------
let inZone = false
const observers = new Set<MockIO>()
class MockIO {
  private cb: IntersectionObserverCallback
  constructor(cb: IntersectionObserverCallback) {
    this.cb = cb
  }
  targets = new Set<Element>()
  observe(el: Element) {
    this.targets.add(el)
    observers.add(this)
    this.emit()
  }
  unobserve(el: Element) {
    this.targets.delete(el)
  }
  disconnect() {
    this.targets.clear()
    observers.delete(this)
  }
  emit() {
    const entries = [...this.targets].map((target) => ({ target, isIntersecting: inZone }))
    if (entries.length) this.cb(entries as IntersectionObserverEntry[], this as never)
  }
}
const setZone = (v: boolean) =>
  act(() => {
    inZone = v
    for (const o of [...observers]) o.emit()
  })

function setOnline(v: boolean) {
  Object.defineProperty(navigator, 'onLine', { value: v, configurable: true })
  act(() => void window.dispatchEvent(new Event(v ? 'online' : 'offline')))
}

beforeEach(() => {
  pending = []
  inZone = false
  observers.clear()
  vi.stubGlobal('IntersectionObserver', MockIO)
  vi.mocked(request).mockReset()
  vi.mocked(request).mockImplementation(
    (path: string) =>
      new Promise((resolve, reject) => {
        const page = Number(new URL(path, 'http://x').searchParams.get('page'))
        pending.push({ page, resolve: resolve as Pending['resolve'], reject })
      }),
  )
})
afterEach(() => {
  vi.unstubAllGlobals()
  setOnline(true)
})

function renderFeed() {
  return render(
    <Providers>
      <MemoryRouter>
        <HomeFeed />
      </MemoryRouter>
    </Providers>,
  )
}
const feedList = () => screen.getByRole('list', { name: '推薦商品' })

describe('HomeFeed (REQ-005)', () => {
  it('REQ-005#AC5 進入觸發區才請求第 1 批；之後依序一次一批，直到到底', async () => {
    renderFeed()
    expect(screen.getByRole('heading', { level: 2, name: '推薦商品' })).toBeInTheDocument()
    expect(request).not.toHaveBeenCalled()

    await setZone(true)
    expect(requested()).toEqual(['/api/home/feed?page=1'])
    expect(await screen.findByRole('status', { name: '載入中' })).toBeInTheDocument()

    for (let page = 1; page <= 5; page++) {
      // exactly one request in flight, and it is for this page
      await vi.waitFor(() => expect([pending.length, requested().length]).toEqual([1, page]))
      await respond()
    }
    expect(requested()).toEqual([1, 2, 3, 4, 5].map((p) => `/api/home/feed?page=${p}`))
    expect(screen.getByRole('status', { name: '已經到底了' })).toBeInTheDocument()

    await setZone(false)
    await setZone(true)
    await flush()
    expect(request).toHaveBeenCalledTimes(5)
  })

  it('REQ-005#AC5 離開觸發區後不再續載，回到觸發區才請求下一批', async () => {
    renderFeed()
    await setZone(true)
    await setZone(false)
    await respond()
    expect(requested()).toEqual(['/api/home/feed?page=1'])
    await setZone(true)
    await vi.waitFor(() =>
      expect(requested()).toEqual(['/api/home/feed?page=1', '/api/home/feed?page=2']),
    )
  })

  it('REQ-005#AC6 失敗時顯示錯誤與重試，保留已載入商品；捲回不自動重試；重試中停用按鈕', async () => {
    const user = userEvent.setup()
    renderFeed()
    await setZone(true)
    await respond()
    await fail(new ApiError('network', 'down'))

    expect(screen.getByText('網路連線異常，請確認網路後重試。')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: '推薦商品' })).toBeInTheDocument()
    expect(within(feedList()).getAllByRole('listitem')[0]).toHaveAttribute('aria-posinset', '1')

    await setZone(false)
    await setZone(true)
    await flush()
    expect(request).toHaveBeenCalledTimes(2)

    const retry = screen.getByRole('button', { name: '重試' })
    await user.click(retry)
    await vi.waitFor(() => expect(request).toHaveBeenCalledTimes(3))
    expect(screen.getByRole('button', { name: '重試' })).toBeDisabled()
    expect(screen.getByRole('status', { name: '載入中' })).toBeInTheDocument()

    await respond()
    expect(screen.queryByRole('button', { name: '重試' })).not.toBeInTheDocument()
    // continues after a successful retry
    await vi.waitFor(() => expect(requested().at(-1)).toBe('/api/home/feed?page=3'))
  })

  it('REQ-005#AC6 第 1 批失敗時保留標題並可重試', async () => {
    const user = userEvent.setup()
    renderFeed()
    await setZone(true)
    await fail(new ApiError('http', 'HTTP 400', 400))
    expect(screen.getByRole('heading', { level: 2, name: '推薦商品' })).toBeInTheDocument()
    expect(screen.getByText('請求失敗，請稍後再試。')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '重試' }))
    await vi.waitFor(() =>
      expect(requested()).toEqual(['/api/home/feed?page=1', '/api/home/feed?page=1']),
    )
    await respond()
    expect(feedList()).toBeInTheDocument()
  })

  it('REQ-005 商品流規格「到底」：回應的 page 與請求不一致時視為失敗', async () => {
    renderFeed()
    await setZone(true)
    await respond({ page: 2 })
    expect(screen.getByRole('button', { name: '重試' })).toBeInTheDocument()
  })

  it.each([{ totalPages: 0, total: 0, items: [] }, { items: [] }])(
    'REQ-005#AC7 第 1 批沒有商品時整個區塊不渲染（%o）',
    async (overrides) => {
      renderFeed()
      await setZone(true)
      await respond(overrides)
      expect(screen.queryByRole('heading', { name: '推薦商品' })).not.toBeInTheDocument()
      expect(screen.queryByRole('list')).not.toBeInTheDocument()
    },
  )

  it('REQ-005#AC10 列表以「推薦商品」標示，每張卡有 aria-setsize（total）與 aria-posinset', async () => {
    renderFeed()
    await setZone(true)
    await respond()
    const items = within(feedList()).getAllByRole('listitem')
    expect(items.length).toBeGreaterThan(0)
    items.forEach((li, i) => {
      expect(li).toHaveAttribute('aria-setsize', '100')
      expect(li).toHaveAttribute('aria-posinset', String(i + 1))
    })
    // one tab stop per card: the product link
    expect(within(items[0]!).getAllByRole('link')).toHaveLength(1)
  })

  it('REQ-005#AC12 商品流卡片價格依 BR-001 顯示（千分位、原價與折數），不顯示限搶價', async () => {
    vi.mocked(request).mockImplementationOnce(async () =>
      feedPage(1, {
        items: [{ ...product(1), price: 43900, listPrice: 49900 }, product(2)],
        total: 2,
        totalPages: 1,
      }),
    )
    renderFeed()
    await setZone(true)
    const [card] = within(await screen.findByRole('list', { name: '推薦商品' })).getAllByRole(
      'listitem',
    )
    expect(card).toHaveTextContent('$43,900')
    expect(card).toHaveTextContent('$49,900')
    expect(card).toHaveTextContent('87折')
    expect(card).not.toHaveTextContent('限搶')
  })

  it('REQ-005 商品流規格「離線」：離線時不請求，恢復連線後自動接續', async () => {
    renderFeed()
    setOnline(false)
    await setZone(true)
    expect(request).not.toHaveBeenCalled()
    setOnline(true)
    await vi.waitFor(() => expect(requested()).toEqual(['/api/home/feed?page=1']))
  })
})
