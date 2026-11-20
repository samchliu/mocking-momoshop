import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PRODUCTS } from '@/api/mock/data'
import { searchProducts } from '@/api/mock/search'
import type { SearchCriteria } from '@/features/catalog'
import { fastMock, renderRoute } from '@/test/render'

const criteria = (c: Partial<SearchCriteria>): SearchCriteria => ({
  q: 'iphone',
  sort: 'relevance',
  brands: [],
  page: 1,
  ...c,
})
/** What the mock backend (BR-002) returns for these criteria, as card heading texts. */
const expectedNames = (c: Partial<SearchCriteria>) =>
  searchProducts(PRODUCTS, criteria(c)).items.map((p) => `${p.brand} ${p.name}`)

const results = () => screen.getByRole('list', { name: '搜尋結果' })
const cardNames = () =>
  within(results())
    .getAllByRole('heading', { level: 2 })
    .map((h) => h.textContent)
const waitForCards = async () => within(await screen.findByRole('list', { name: '搜尋結果' }))
const pager = () => screen.getByRole('navigation', { name: '分頁' })

beforeEach(fastMock)

describe('SearchResults (REQ-001)', () => {
  it('REQ-001#AC1 shows the heading, result count and the first page of products', async () => {
    renderRoute('/search/iphone')
    const total = searchProducts(PRODUCTS, criteria({})).total
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(
      '「iphone」的搜尋結果',
    )
    await waitForCards()
    expect(screen.getByText(`共 ${total} 件商品`)).toBeInTheDocument()
    expect(cardNames()).toEqual(expectedNames({}))
    expect(cardNames()).toHaveLength(20)
  })

  it('REQ-001#AC2 價格低→高排序、URL 帶 sort=price_asc 並回到第 1 頁 (BR-002#R6)', async () => {
    const { router } = renderRoute('/search/iphone?page=2')
    await waitForCards()
    await userEvent.click(screen.getByRole('button', { name: '價格低→高' }))
    expect(router.state.location.search).toBe('?sort=price_asc')
    expect(screen.getByRole('button', { name: '價格低→高' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await waitFor(() => expect(cardNames()).toEqual(expectedNames({ sort: 'price_asc' })))
  })

  it('REQ-001#AC3 勾選兩個品牌只顯示這兩個品牌，件數不受品牌條件影響 (BR-002#R7)', async () => {
    const { router } = renderRoute('/search/iphone?page=2')
    await waitForCards()
    const spigenBefore = screen.getByRole('checkbox', { name: /^Spigen/ })
    const spigenLabel = spigenBefore.closest('label')?.textContent
    await userEvent.click(screen.getByRole('checkbox', { name: /^Apple/ }))
    await userEvent.click(screen.getByRole('checkbox', { name: /^ESR/ }))
    expect(router.state.location.search).toBe('?brand=Apple&brand=ESR')
    const expected = expectedNames({ brands: ['Apple', 'ESR'] })
    await waitFor(() => expect(cardNames()).toEqual(expected))
    expect(cardNames().every((n) => /^(Apple|ESR) /.test(n ?? ''))).toBe(true)
    expect(screen.getByRole('checkbox', { name: /^Spigen/ }).closest('label')?.textContent).toBe(
      spigenLabel,
    )
    // unchecking removes just that brand
    await userEvent.click(screen.getByRole('checkbox', { name: /^ESR/ }))
    expect(router.state.location.search).toBe('?brand=Apple')
  })

  it('REQ-001#AC3 restores brand, price and sort conditions from a shared URL', async () => {
    renderRoute('/search/iphone?sort=price_desc&brand=Apple&min=30000&max=50000')
    await waitForCards()
    expect(screen.getByRole('checkbox', { name: /^Apple/ })).toBeChecked()
    expect(screen.getByLabelText('最低價')).toHaveValue(30000)
    expect(screen.getByLabelText('最高價')).toHaveValue(50000)
    expect(screen.getByRole('button', { name: '價格高→低' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(cardNames()).toEqual(
      expectedNames({ sort: 'price_desc', brands: ['Apple'], min: 30000, max: 50000 }),
    )
  })

  it('REQ-001#AC3 applies the price range on submit and resets the page (BR-002#R4, R6)', async () => {
    const { router } = renderRoute('/search/iphone?page=2')
    await waitForCards()
    await userEvent.type(screen.getByLabelText('最低價'), '500')
    await userEvent.type(screen.getByLabelText('最高價'), '1500')
    expect(router.state.location.search).toBe('?page=2') // not applied until submitted
    await userEvent.click(screen.getByRole('button', { name: '確認' }))
    expect(router.state.location.search).toBe('?min=500&max=1500')
    await waitFor(() => expect(cardNames()).toEqual(expectedNames({ min: 500, max: 1500 })))
  })

  it('REQ-001#AC4 shows 頁數 x/y with previous / next links', async () => {
    const { router } = renderRoute('/search/iphone')
    await waitForCards()
    const { totalPages } = searchProducts(PRODUCTS, criteria({}))
    expect(totalPages).toBeGreaterThan(1)
    expect(within(pager()).getByText(`頁數 1/${totalPages}`)).toBeInTheDocument()
    expect(within(pager()).queryByRole('link', { name: '上一頁' })).not.toBeInTheDocument()
    await userEvent.click(within(pager()).getByRole('link', { name: '下一頁' }))
    expect(router.state.location.search).toBe('?page=2')
    await waitFor(() => expect(cardNames()).toEqual(expectedNames({ page: 2 })))
    expect(within(pager()).getByText(`頁數 2/${totalPages}`)).toBeInTheDocument()
    expect(within(pager()).getByRole('link', { name: '上一頁' })).toHaveAttribute(
      'href',
      '/search/iphone',
    )
  })

  it('REQ-001#AC4 BR-002#R5 corrects an out-of-range page in the URL (replace)', async () => {
    const { router } = renderRoute('/search/iphone?sort=sales&page=99')
    const { totalPages } = searchProducts(PRODUCTS, criteria({}))
    await waitFor(() => expect(router.state.location.search).toBe(`?sort=sales&page=${totalPages}`))
    expect(router.state.historyAction).toBe('REPLACE')
    await waitForCards()
    expect(within(pager()).getByText(`頁數 ${totalPages}/${totalPages}`)).toBeInTheDocument()
  })

  it('REQ-001#AC4 BR-002#R5 removes an illegal page from the URL', async () => {
    const { router } = renderRoute('/search/iphone?page=abc')
    await waitFor(() => expect(router.state.location.search).toBe(''))
    await waitForCards()
    expect(cardNames()).toEqual(expectedNames({}))
  })

  it('REQ-001#AC5 shows an empty state with 清除篩選 when filters are active', async () => {
    const { router } = renderRoute('/search/iphone?sort=sales&min=99999999')
    expect(await screen.findByText('查無符合條件的商品')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '清除篩選' }))
    expect(router.state.location.search).toBe('?sort=sales')
    await waitForCards()
  })

  it('REQ-001#AC5 offers hot keywords when nothing matches the keyword itself', async () => {
    renderRoute('/search/zzzzqqq')
    expect(await screen.findByText('查無「zzzzqqq」的相關商品')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '清除篩選' })).not.toBeInTheDocument()
    const hot = await screen.findByRole('navigation', { name: '熱門關鍵字' })
    expect(within(hot).getAllByRole('link').length).toBeGreaterThan(0)
    expect(within(hot).getAllByRole('link')[0]).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/search\//),
    )
  })

  it('REQ-001#AC6 shows a skeleton while loading', async () => {
    window.history.replaceState(null, '', '/?latency=100')
    renderRoute('/search/iphone')
    expect(await screen.findByRole('status', { name: '載入中' })).toBeInTheDocument()
    await waitForCards()
    expect(screen.queryByRole('status', { name: '載入中' })).not.toBeInTheDocument()
  })

  it('REQ-001#AC6 shows a readable error with 重試 that recovers', async () => {
    window.history.replaceState(null, '', '/?latency=0&fail=1')
    renderRoute('/search/iphone')
    expect(await screen.findByRole('alert')).toHaveTextContent('服務暫時無法使用')
    window.history.replaceState(null, '', '/?latency=0')
    await userEvent.click(screen.getByRole('button', { name: '重試' }))
    await waitForCards()
    expect(cardNames()).toEqual(expectedNames({}))
  })

  it('REQ-001#AC6 rapid condition changes end on the latest result', async () => {
    window.history.replaceState(null, '', '/?latency=40')
    const { router } = renderRoute('/search/iphone')
    await waitForCards()
    await userEvent.click(screen.getByRole('button', { name: '銷量' }))
    await userEvent.click(screen.getByRole('button', { name: '價格高→低' }))
    await userEvent.click(screen.getByRole('checkbox', { name: /^Apple/ }))
    expect(router.state.location.search).toBe('?sort=price_desc&brand=Apple')
    const expected = expectedNames({ sort: 'price_desc', brands: ['Apple'] })
    await waitFor(() => expect(cardNames()).toEqual(expected))
    // and it stays there (no late, stale response overwrites it)
    await new Promise((r) => setTimeout(r, 120))
    expect(cardNames()).toEqual(expected)
  })
})

describe('SearchResults URL edge cases (REQ-001 v3)', () => {
  afterEach(() => vi.restoreAllMocks())

  it('REQ-001#AC8 blank keyword: only the heading, no request, query ignored', async () => {
    const fetchSpy = vi.spyOn(await import('@/api/mock'), 'mockFetch')
    const { router } = renderRoute('/search/%20?page=3&brand=Apple')
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('請輸入搜尋關鍵字')
    expect(screen.queryByRole('list', { name: '搜尋結果' })).toBeNull()
    expect(screen.queryByRole('navigation', { name: '分頁' })).toBeNull()
    expect(screen.queryByText(/共 \d+ 件商品/)).toBeNull()
    expect(fetchSpy.mock.calls.filter(([p]) => String(p).startsWith('/api/search'))).toHaveLength(0)
    expect(router.state.location.search).toBe('?page=3&brand=Apple')
  })

  it('REQ-001#AC8 /search/ without a keyword shows the not-found page', async () => {
    renderRoute('/search/')
    expect(await screen.findByRole('heading', { name: '找不到這個頁面' })).toBeInTheDocument()
  })

  it('REQ-001#AC9 illegal sort/min fall back without rewriting the URL; later changes keep them', async () => {
    const { router } = renderRoute('/search/iphone?sort=foo&min=abc&max=2000')
    await waitForCards()
    expect(cardNames()).toEqual(expectedNames({ max: 2000 }))
    expect(screen.getByRole('button', { name: '綜合推薦' })).toHaveAttribute('aria-pressed', 'true')
    expect(router.state.location.search).toBe('?sort=foo&min=abc&max=2000')
    await userEvent.click(screen.getByRole('checkbox', { name: /^ESR/ }))
    await waitFor(() =>
      expect(router.state.location.search).toBe('?sort=foo&min=abc&max=2000&brand=ESR'),
    )
  })
})
