import { act, render, screen } from '@testing-library/react'
import { OfflineBanner } from './OfflineBanner'

describe('OfflineBanner', () => {
  afterEach(() => vi.restoreAllMocks())

  it('appears when the browser goes offline and hides when back online', () => {
    const onLine = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    render(<OfflineBanner />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    onLine.mockReturnValue(false)
    act(() => window.dispatchEvent(new Event('offline')))
    expect(screen.getByRole('alert')).toHaveTextContent('離線')

    onLine.mockReturnValue(true)
    act(() => window.dispatchEvent(new Event('online')))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
