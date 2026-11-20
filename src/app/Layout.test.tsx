import { act, fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { fastMock, renderRoute } from '@/test/render'

beforeEach(fastMock)
afterEach(() => {
  document.body.style.position = ''
  setScrollY(0)
})

function setScrollY(y: number) {
  Object.defineProperty(window, 'scrollY', { value: y, configurable: true, writable: true })
}

function scrollTo(y: number) {
  act(() => {
    setScrollY(y)
    fireEvent.scroll(window)
  })
}

// jsdom counts section-level <header>s (search results, flash sale) as banners too; the site header is the first.
const siteHeader = async () => (await screen.findAllByRole('banner'))[0]!
const catNav = () => screen.queryByRole('navigation', { name: '商品分類' })

describe('fixed collapsing header (REQ-005)', () => {
  it('REQ-005#AC2 scrollY>0 收合（分類導覽隱藏），scrollY<=0 展開', async () => {
    renderRoute('/')
    await siteHeader()
    expect(catNav()).toBeInTheDocument()

    scrollTo(1)
    expect(catNav()).toBeNull()

    scrollTo(0.5)
    expect(catNav()).toBeNull()

    scrollTo(0)
    expect(catNav()).toBeInTheDocument()

    // iOS rubber-band overscroll reports negative scrollY: treated as top.
    scrollTo(-20)
    expect(catNav()).toBeInTheDocument()
  })

  it('REQ-005#AC2 首次渲染即依當下 scrollY 決定版型', async () => {
    setScrollY(500)
    renderRoute('/')
    await siteHeader()
    expect(catNav()).toBeNull()
  })

  it.each(['/', '/search/iphone'])(
    'REQ-005#AC2 兩種版型都含 logo、搜尋框、購物車，且只有一個搜尋框（%s）',
    async (path) => {
      renderRoute(path)
      const header = await siteHeader()
      for (const y of [0, 300]) {
        scrollTo(y)
        expect(screen.getAllByRole('searchbox')).toHaveLength(1)
        const h = within(header)
        expect(h.getByRole('searchbox', { name: '搜尋商品' })).toBeInTheDocument()
        expect(h.getByRole('link', { name: 'momo shop 首頁' })).toBeInTheDocument()
        expect(h.getByRole('link', { name: /^購物車/ })).toBeInTheDocument()
      }
    },
  )

  it('REQ-005#AC3 輸入中切換版型，焦點與已輸入文字不遺失', async () => {
    const user = userEvent.setup()
    renderRoute('/')
    const box = await screen.findByRole('searchbox', { name: '搜尋商品' })
    await user.type(box, '吹風機')

    scrollTo(400)
    expect(catNav()).toBeNull()
    expect(document.activeElement).toBe(box)
    expect(screen.getByRole('searchbox')).toBe(box)
    expect(box).toHaveValue('吹風機')

    scrollTo(0)
    expect(document.activeElement).toBe(box)
    expect(box).toHaveValue('吹風機')
  })

  it('REQ-005#AC3 焦點在分類導覽內時收合，焦點移到搜尋框', async () => {
    renderRoute('/')
    await siteHeader()
    const link = within(catNav()!).getByRole('link', { name: 'Dyson' })
    act(() => link.focus())
    expect(document.activeElement).toBe(link)

    scrollTo(200)
    expect(catNav()).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('searchbox', { name: '搜尋商品' }))
  })

  it('REQ-005#AC3 捲動鎖定期間版型不變', async () => {
    renderRoute('/')
    await siteHeader()
    scrollTo(300)
    expect(catNav()).toBeNull()

    // e.g. a modal pinning <body> resets scrollY to 0 while locked
    document.body.style.position = 'fixed'
    scrollTo(0)
    expect(catNav()).toBeNull()

    document.body.style.position = ''
    scrollTo(0)
    expect(catNav()).toBeInTheDocument()
  })

  it('REQ-005#AC4 收合版送出與 REQ-001#AC1 相同', async () => {
    const user = userEvent.setup()
    const { router } = renderRoute('/')
    const box = await screen.findByRole('searchbox', { name: '搜尋商品' })
    scrollTo(400)
    await user.type(box, ' iphone {Enter}')
    expect(router.state.location.pathname).toBe('/search/iphone')
  })

  it('REQ-005#AC4 正規化後為空時不送出、保留原值與焦點', async () => {
    const user = userEvent.setup()
    const { router } = renderRoute('/')
    const box = await screen.findByRole('searchbox', { name: '搜尋商品' })
    for (const y of [0, 400]) {
      scrollTo(y)
      await user.clear(box)
      await user.type(box, '  <> {Enter}')
      expect(router.state.location.pathname).toBe('/')
      expect(box).toHaveValue('  <> ')
      expect(document.activeElement).toBe(box)
      expect(screen.queryByRole('alert')).toBeNull()
    }
  })
})
