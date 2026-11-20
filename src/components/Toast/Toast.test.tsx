import { act, render, screen } from '@testing-library/react'
import { ToastProvider } from './ToastProvider'
import { useToast } from './context'

function Trigger() {
  const toast = useToast()
  return (
    <button type="button" onClick={() => toast.show('已加入購物車', 'success')}>
      add
    </button>
  )
}

describe('Toast', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('announces a message and auto-dismisses it', () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    )
    act(() => screen.getByRole('button', { name: 'add' }).click())
    expect(screen.getByRole('status')).toHaveTextContent('已加入購物車')
    act(() => vi.advanceTimersByTime(3000))
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('caps the number of visible toasts', () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    )
    const btn = screen.getByRole('button', { name: 'add' })
    act(() => {
      for (let i = 0; i < 5; i++) btn.click()
    })
    expect(screen.getAllByText('已加入購物車')).toHaveLength(3)
  })

  it('throws a clear error outside the provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Trigger />)).toThrow(/ToastProvider/)
  })
})
