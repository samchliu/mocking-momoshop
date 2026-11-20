import { act, fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderRoute } from '@/test/render'
import { HeroCarousel } from './HeroCarousel'
import { banners } from './testData'

function renderCarousel() {
  return renderRoute('/', [
    { path: '/', element: <HeroCarousel banners={banners} /> },
    { path: '/search/:keyword', element: <p>search page</p> },
  ])
}

const visibleBanner = () =>
  screen.getByRole('link', { name: /iPhone 特賣|Dyson 家電週|保護貼|筆電/ })

describe('HeroCarousel', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('REQ-003#AC1 shows one banner at a time; next/prev buttons switch and wrap around', async () => {
    renderCarousel()
    expect(visibleBanner()).toHaveAccessibleName('iPhone 特賣')
    await userEvent.click(screen.getByRole('button', { name: '下一張' }))
    expect(visibleBanner()).toHaveAccessibleName('Dyson 家電週')
    await userEvent.click(screen.getByRole('button', { name: '上一張' }))
    await userEvent.click(screen.getByRole('button', { name: '上一張' }))
    expect(visibleBanner()).toHaveAccessibleName('筆電')
  })

  it('REQ-003#AC1 dots jump to a banner and mark the current one', async () => {
    renderCarousel()
    const dots = screen.getByRole('group', { name: '選擇橫幅' })
    await userEvent.click(within(dots).getByRole('button', { name: '第 3 張' }))
    expect(visibleBanner()).toHaveAccessibleName('保護貼')
    expect(within(dots).getByRole('button', { name: '第 3 張' })).toHaveAttribute(
      'aria-current',
      'true',
    )
    expect(within(dots).getByRole('button', { name: '第 1 張' })).not.toHaveAttribute(
      'aria-current',
    )
  })

  it('REQ-003#AC1 keyboard: arrow keys switch banners, buttons are reachable with Tab', async () => {
    renderCarousel()
    await userEvent.tab()
    expect(visibleBanner()).toHaveFocus()
    await userEvent.keyboard('{ArrowRight}')
    expect(visibleBanner()).toHaveAccessibleName('Dyson 家電週')
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}')
    expect(visibleBanner()).toHaveAccessibleName('筆電')
    await userEvent.tab()
    expect(screen.getByRole('button', { name: '上一張' })).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    expect(visibleBanner()).toHaveAccessibleName('保護貼')
  })

  it('REQ-003#AC1 first banner is the LCP image (eager, high priority); the others lazy-load', () => {
    renderCarousel()
    const imgs = screen.getAllByRole('img', { hidden: true })
    expect(imgs).toHaveLength(4)
    expect(imgs[0]).toHaveAttribute('loading', 'eager')
    expect(imgs[0]).toHaveAttribute('fetchpriority', 'high')
    for (const img of imgs.slice(1)) expect(img).toHaveAttribute('loading', 'lazy')
    for (const img of imgs) {
      expect(img).toHaveAttribute('width', '1200')
      expect(img).toHaveAttribute('height', '400')
    }
  })

  it('REQ-003#AC1 banner links navigate to their href', async () => {
    const { router } = renderCarousel()
    await userEvent.click(visibleBanner())
    expect(router.state.location.pathname).toBe('/search/k1')
  })

  it('REQ-003#AC1 auto-advances, pauses on hover and focus', () => {
    vi.useFakeTimers()
    renderCarousel()
    act(() => vi.advanceTimersByTime(5000))
    expect(visibleBanner()).toHaveAccessibleName('Dyson 家電週')

    const region = screen.getByRole('region', { name: '主打活動' })
    fireEvent.mouseEnter(region)
    act(() => vi.advanceTimersByTime(15000))
    expect(visibleBanner()).toHaveAccessibleName('Dyson 家電週')
    fireEvent.mouseLeave(region)

    const next = screen.getByRole('button', { name: '下一張' })
    act(() => next.focus())
    act(() => vi.advanceTimersByTime(15000))
    expect(visibleBanner()).toHaveAccessibleName('Dyson 家電週')
    act(() => next.blur())

    act(() => vi.advanceTimersByTime(5000))
    expect(visibleBanner()).toHaveAccessibleName('保護貼')
  })

  it('REQ-003#AC1 the pause button stops auto-advance', () => {
    vi.useFakeTimers()
    renderCarousel()
    fireEvent.click(screen.getByRole('button', { name: '暫停輪播' }))
    act(() => vi.advanceTimersByTime(20000))
    expect(visibleBanner()).toHaveAccessibleName('iPhone 特賣')
    fireEvent.click(screen.getByRole('button', { name: '播放輪播' }))
    act(() => vi.advanceTimersByTime(5000))
    expect(visibleBanner()).toHaveAccessibleName('Dyson 家電週')
  })

  it('REQ-003#AC1 respects prefers-reduced-motion: no auto-advance', () => {
    vi.stubGlobal('matchMedia', (q: string) => ({
      matches: q.includes('prefers-reduced-motion'),
      media: q,
      addEventListener: () => {},
      removeEventListener: () => {},
    }))
    vi.useFakeTimers()
    renderCarousel()
    act(() => vi.advanceTimersByTime(20000))
    expect(visibleBanner()).toHaveAccessibleName('iPhone 特賣')
  })
})
