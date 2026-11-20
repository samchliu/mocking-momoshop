import { act, screen, within } from '@testing-library/react'
import { renderRoute } from '@/test/render'
import { FlashSale } from './FlashSale'
import { flashItem } from './testData'

const sale = {
  startsAt: '2026-11-20T10:00:00.000Z',
  endsAt: '2026-11-20T12:00:00.000Z',
  items: [flashItem('a', 850, 3), flashItem('b', 700, 0)],
}

function renderSale() {
  return renderRoute('/', [{ path: '/', element: <FlashSale sale={sale} /> }])
}

describe('FlashSale', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('REQ-003#AC2 countdown shows hh:mm:ss and updates every second', () => {
    vi.setSystemTime(new Date('2026-11-20T10:58:57.000Z'))
    renderSale()
    const timer = screen.getByRole('timer', { name: '距離結束' })
    expect(timer).toHaveTextContent('01:01:03')
    act(() => vi.advanceTimersByTime(1000))
    expect(timer).toHaveTextContent('01:01:02')
    act(() => vi.advanceTimersByTime(62_000))
    expect(timer).toHaveTextContent('01:00:00')
  })

  it('REQ-003#AC2 shows flash price with original price and remaining sets while active', () => {
    vi.setSystemTime(new Date('2026-11-20T11:00:00.000Z'))
    renderSale()
    const [a, b] = screen.getAllByRole('listitem')
    expect(within(a!).getByText('$850')).toBeInTheDocument()
    expect(within(a!).getByText('$1,000')).toBeInTheDocument()
    expect(within(a!).getByText('最後3組')).toBeInTheDocument()
    expect(within(b!).getByText('已搶完')).toBeInTheDocument()
    expect(within(a!).getByRole('link', { name: /商品 a/ })).toHaveAttribute('href', '/goods/a')
  })

  it('BR-001#R5 when the countdown reaches zero shows 「已結束」 and the normal price only', () => {
    vi.setSystemTime(new Date('2026-11-20T11:59:58.000Z'))
    renderSale()
    expect(screen.getByText('$850')).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(2000))
    expect(screen.queryByRole('timer')).not.toBeInTheDocument()
    expect(screen.getByText('已結束')).toBeInTheDocument()
    expect(screen.queryByText('$850')).not.toBeInTheDocument()
    expect(screen.queryByText('$700')).not.toBeInTheDocument()
    expect(screen.getAllByText('$1,000')).toHaveLength(2)
  })

  it('BR-001#R5 a sale that has already ended renders without flash prices', () => {
    vi.setSystemTime(new Date('2026-11-20T13:00:00.000Z'))
    renderSale()
    expect(screen.getByText('已結束')).toBeInTheDocument()
    expect(screen.queryByText('$850')).not.toBeInTheDocument()
  })
})
