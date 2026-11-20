import { screen, within } from '@testing-library/react'
import { fastMock, renderRoute } from '@/test/render'

beforeEach(fastMock)

const nav = () => screen.getByRole('navigation', { name: '商品分類' })
const findNav = () => screen.findByRole('navigation', { name: '商品分類' })

describe('site header (REQ-004)', () => {
  it('REQ-004#AC2 row 1: logo → /, search, cart; row 2: category links to /search/<encoded> without query', async () => {
    renderRoute('/')
    await screen.findByRole('heading', { level: 1 })
    const banner = screen.getByRole('banner')
    expect(within(banner).getByRole('link', { name: 'momo shop 首頁' })).toHaveAttribute(
      'href',
      '/',
    )
    expect(within(banner).getByRole('searchbox', { name: '搜尋商品' })).toBeInTheDocument()
    expect(within(banner).getByRole('link', { name: /^購物車/ })).toBeInTheDocument()
    const links = within(nav()).getAllByRole('link')
    expect(links.map((a) => a.textContent)).toEqual([
      'iPhone',
      'Galaxy',
      'Pixel',
      'MacBook',
      'AirPods',
      'Dyson',
      '吹風機',
      '保護貼',
      '手機殼',
    ])
    expect(within(nav()).getByRole('link', { name: 'iPhone' })).toHaveAttribute(
      'href',
      '/search/iPhone',
    )
    expect(within(nav()).getByRole('link', { name: '吹風機' })).toHaveAttribute(
      'href',
      '/search/%E5%90%B9%E9%A2%A8%E6%A9%9F',
    )
  })

  it('REQ-004#AC3 marks the current category on /search/:keyword only', async () => {
    renderRoute('/search/%EF%BD%89%EF%BD%90%EF%BD%88%EF%BD%8F%EF%BD%8E%EF%BD%85?sort=price_asc')
    const iphone = within(await findNav()).getByRole('link', { name: 'iPhone' })
    expect(iphone).toHaveAttribute('aria-current', 'page')
    expect(within(nav()).getByRole('link', { name: 'Galaxy' })).not.toHaveAttribute('aria-current')
  })

  it('REQ-004#AC3 no category is current for a non-matching keyword or outside search', async () => {
    renderRoute('/search/iPhone%2015')
    await findNav()
    expect(within(nav()).queryByRole('link', { current: 'page' })).toBeNull()
  })
})
