import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DEMO } from '@/api/mock/data'
import { fastMock, renderRoute } from '@/test/render'
import { CartBadge } from './CartBadge'
import { useAddToCart } from './useAddToCart'

function Harness({
  productId,
  variantId,
  quantity,
}: {
  productId: string
  variantId: string | null
  quantity: number
}) {
  const add = useAddToCart()
  return (
    <>
      <CartBadge />
      <button
        type="button"
        disabled={add.isPending}
        onClick={() => add.mutate({ productId, variantId, quantity })}
      >
        放入購物車
      </button>
    </>
  )
}
const at = (props: Parameters<typeof Harness>[0]) =>
  renderRoute('/', [{ path: '/', element: <Harness {...props} /> }])

beforeEach(() => {
  localStorage.clear()
  fastMock()
})

describe('useAddToCart', () => {
  it('REQ-002#AC4 BR-003#R4 disables while pending so a double click sends once', async () => {
    const fetchSpy = vi.spyOn(await import('@/api/mock'), 'mockFetch')
    window.history.replaceState(null, '', '/?latency=50')
    at({ productId: DEMO.simpleProduct, variantId: null, quantity: 1 })
    const button = screen.getByRole('button', { name: '放入購物車' })
    await userEvent.dblClick(button)
    expect(button).toBeDisabled()
    expect(await screen.findByText('已加入購物車')).toBeInTheDocument()
    expect(fetchSpy.mock.calls.filter(([p]) => p === '/api/cart/items')).toHaveLength(1)
    fetchSpy.mockRestore()
  })

  it('REQ-002#AC4 BR-003#R5 updates the header badge and persists the cart', async () => {
    at({ productId: DEMO.simpleProduct, variantId: null, quantity: 2 })
    await userEvent.click(screen.getByRole('button', { name: '放入購物車' }))
    expect(screen.getByRole('link', { name: '購物車，2 件商品' })).toBeInTheDocument()
    await screen.findByText('已加入購物車')
    expect(JSON.parse(localStorage.getItem('cart:v1') ?? '{}')).toMatchObject({
      lines: [{ quantity: 2 }],
    })
  })

  it('REQ-002#AC4 BR-003#R5 rolls back and explains when the server rejects (409)', async () => {
    at({ productId: DEMO.soldOutProduct, variantId: null, quantity: 1 })
    await userEvent.click(screen.getByRole('button', { name: '放入購物車' }))
    expect(await screen.findByText('超過可購買數量')).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByRole('link', { name: '購物車，0 件商品' })).toBeInTheDocument(),
    )
  })

  it('BR-003#R6 ignores a tampered persisted cart', async () => {
    localStorage.setItem('cart:v1', '{"lines":[{"productId":"x","quantity":"lots"}]}')
    await act(async () => {
      at({ productId: DEMO.simpleProduct, variantId: null, quantity: 1 })
    })
    expect(screen.getByRole('link', { name: '購物車，0 件商品' })).toBeInTheDocument()
  })
})
