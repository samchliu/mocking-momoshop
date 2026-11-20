import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderRoute } from '@/test/render'
import { HomeSections } from './HomeSections'
import { HotKeywords } from './HotKeywords'
import { product } from './testData'

type IOCallback = (entries: Array<{ isIntersecting: boolean }>) => void

describe('HomeSections', () => {
  let callbacks: IOCallback[] = []
  beforeEach(() => {
    callbacks = []
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(cb: IOCallback) {
          callbacks.push(cb)
        }
        observe() {}
        disconnect() {}
      },
    )
  })
  afterEach(() => vi.unstubAllGlobals())

  const sections = [
    { id: 'hot', title: '大家都在買', items: [product('h1'), product('h2')] },
    { id: 'new', title: '新品上市', items: [product('n1')] },
  ]

  it('REQ-003#AC3 product strips render only once near the viewport, with reserved height', () => {
    const { container } = renderRoute('/', [
      { path: '/', element: <HomeSections sections={sections} /> },
    ])
    expect(screen.getByRole('heading', { level: 2, name: '大家都在買' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: '新品上市' })).toBeInTheDocument()
    expect(screen.queryAllByRole('article')).toHaveLength(0)
    const placeholders = container.querySelectorAll<HTMLElement>('[style*="min-height"]')
    expect(placeholders).toHaveLength(2)
    for (const p of placeholders) expect(parseInt(p.style.minHeight, 10)).toBeGreaterThan(0)

    act(() => callbacks.forEach((cb) => cb([{ isIntersecting: true }])))
    expect(screen.getAllByRole('article')).toHaveLength(3)
    expect(screen.getByRole('heading', { level: 3, name: /商品 h1/ })).toBeInTheDocument()
  })
})

describe('HotKeywords', () => {
  it('REQ-003#AC4 clicking a hot keyword navigates to /search/<keyword> (encoded)', async () => {
    const { router } = renderRoute('/', [
      { path: '/', element: <HotKeywords keywords={['iphone', '保護貼', 'a b']} /> },
      { path: '/search/:keyword', element: <p>search page</p> },
    ])
    const nav = screen.getByRole('navigation', { name: '熱門搜尋' })
    expect(screen.getByRole('link', { name: 'a b' })).toHaveAttribute('href', '/search/a%20b')
    expect(nav).toBeInTheDocument()
    await userEvent.click(screen.getByRole('link', { name: '保護貼' }))
    expect(router.state.location.pathname).toBe(`/search/${encodeURIComponent('保護貼')}`)
    expect(await screen.findByText('search page')).toBeInTheDocument()
  })
})
