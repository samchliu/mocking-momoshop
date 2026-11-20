import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DEMO } from '@/api/mock/data'
import { fastMock, renderRoute } from '@/test/render'

// Integration tests through the real route table: /goods/:id → pages/GoodsPage → features/goods + cart.
beforeEach(() => {
  localStorage.clear()
  fastMock()
})
afterEach(() => vi.restoreAllMocks())

const open = async (id: string) => {
  const utils = renderRoute(`/goods/${id}`)
  await screen.findByRole('heading', { level: 1 })
  return utils
}
const addButton = () => screen.getByRole('button', { name: /放入購物車|已售完/ })
const priceBlock = () => screen.getByRole('region', { name: '價格' })
const cartPosts = (spy: { mock: { calls: unknown[][] } }) =>
  spy.mock.calls.filter(([p]) => p === '/api/cart/items')

describe('GoodsPage (REQ-002)', () => {
  it('REQ-002#AC1 shows images, brand, name, price block, variants, quantity and 放入購物車', async () => {
    await open(DEMO.variantProduct)
    expect(
      screen.getByRole('heading', { level: 1, name: 'iPhone 17 Pro 原廠公司貨' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Apple', { selector: '[data-brand]' })).toBeInTheDocument()
    expect(screen.getAllByRole('img').length).toBeGreaterThan(0)
    const variants = screen.getByRole('group', { name: '規格' })
    expect(within(variants).getAllByRole('radio')).toHaveLength(3)
    expect(screen.getByRole('spinbutton', { name: '數量' })).toHaveValue(1)
    expect(addButton()).toHaveTextContent('放入購物車')
    expect(screen.getByRole('navigation', { name: '麵包屑' })).toBeInTheDocument()
  })

  it('BR-001#R4 BR-001#R6 price block: 售價 + 起 before choosing, then the chosen variant price', async () => {
    await open(DEMO.variantProduct)
    let block = within(priceBlock())
    expect(block.getByText('售價')).toBeInTheDocument()
    expect(block.getByText('$39,900')).toBeInTheDocument()
    expect(block.getByText('起')).toBeInTheDocument()
    expect(block.getByText('原價')).toBeInTheDocument()
    expect(block.getByText('$41,900').closest('s')).not.toBeNull()
    expect(block.getByText('95折')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('radio', { name: /512GB/ }))
    block = within(priceBlock())
    expect(block.getByText('$46,900')).toBeInTheDocument()
    expect(block.queryByText('起')).not.toBeInTheDocument()
    expect(block.getByText('$48,900')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('radio', { name: /1TB/ }))
    block = within(priceBlock())
    expect(block.getByText('$53,900')).toBeInTheDocument()
    expect(block.queryByText('原價')).not.toBeInTheDocument()
  })

  it('REQ-002#AC2 BR-003#R1 未選規格點放入購物車：不送出請求並提示「請選擇規格」', async () => {
    const fetchSpy = vi.spyOn(await import('@/api/mock'), 'mockFetch')
    await open(DEMO.variantProduct)
    await userEvent.click(addButton())
    expect(screen.getByText('請選擇規格')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: '規格' })).toHaveAccessibleDescription('請選擇規格')
    expect(cartPosts(fetchSpy)).toHaveLength(0)
    expect(screen.getByRole('link', { name: '購物車，0 件商品' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('radio', { name: /256GB/ }))
    expect(screen.queryByText('請選擇規格')).not.toBeInTheDocument()
  })

  it('REQ-002#AC3 BR-003#R2 quantity is clamped to 1..min(stock, limit) and illegal input is corrected', async () => {
    await open(DEMO.simpleProduct) // stock 3, limit 5
    expect(screen.getByText(/限購 5 件/)).toBeInTheDocument()
    const qty = screen.getByRole('spinbutton', { name: '數量' })
    const minus = screen.getByRole('button', { name: '減少數量' })
    const plus = screen.getByRole('button', { name: '增加數量' })
    expect(minus).toBeDisabled()

    await userEvent.clear(qty)
    await userEvent.type(qty, '9')
    await userEvent.tab()
    expect(qty).toHaveValue(3)
    expect(plus).toBeDisabled()

    await userEvent.clear(qty)
    await userEvent.type(qty, '-2')
    await userEvent.tab()
    expect(qty).toHaveValue(1)

    await userEvent.click(plus)
    await userEvent.click(plus)
    await userEvent.click(plus)
    expect(qty).toHaveValue(3)
  })

  it('REQ-002#AC3 BR-003#R2 choosing a variant re-clamps to its stock and the purchase limit', async () => {
    await open(DEMO.variantProduct) // limit 2
    expect(screen.getByText(/限購 2 件/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('radio', { name: /256GB/ }))
    const qty = screen.getByRole('spinbutton', { name: '數量' })
    await userEvent.clear(qty)
    await userEvent.type(qty, '5')
    await userEvent.tab()
    expect(qty).toHaveValue(2)
  })

  it('REQ-002#AC4 BR-003#R4 button is disabled while pending; success toasts and updates the header badge', async () => {
    const fetchSpy = vi.spyOn(await import('@/api/mock'), 'mockFetch')
    window.history.replaceState(null, '', '/?latency=50')
    await open(DEMO.simpleProduct)
    await userEvent.click(screen.getByRole('button', { name: '增加數量' }))
    await userEvent.dblClick(addButton())
    expect(addButton()).toBeDisabled()
    expect(screen.getByRole('link', { name: '購物車，2 件商品' })).toBeInTheDocument()
    expect(await screen.findByText('已加入購物車')).toBeInTheDocument()
    await waitFor(() => expect(addButton()).toBeEnabled())
    expect(cartPosts(fetchSpy)).toHaveLength(1)
  })

  it('REQ-002#AC4 BR-003#R5 failure explains why and keeps the header count', async () => {
    await open(DEMO.variantProduct)
    await userEvent.click(screen.getByRole('radio', { name: /512GB/ })) // stock 2, limit 2
    await userEvent.click(screen.getByRole('button', { name: '增加數量' }))
    await userEvent.click(addButton())
    await screen.findByText('已加入購物車')
    await waitFor(() => expect(addButton()).toBeEnabled())

    await userEvent.click(addButton())
    expect(await screen.findByText('超過可購買數量')).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByRole('link', { name: '購物車，2 件商品' })).toBeInTheDocument(),
    )
  })

  it('REQ-002#AC5 BR-003#R3 sold-out product: button disabled and shows 「已售完」', async () => {
    await open(DEMO.soldOutProduct)
    expect(addButton()).toBeDisabled()
    expect(addButton()).toHaveTextContent('已售完')
  })

  it('REQ-002#AC5 BR-003#R3 sold-out variant is marked, and selecting it disables the button', async () => {
    await open(DEMO.variantProduct)
    const soldOut = screen.getByRole('radio', { name: /1TB/ })
    expect(soldOut).toHaveAccessibleName(expect.stringContaining('已售完'))
    expect(screen.getByRole('radio', { name: /256GB/ })).not.toHaveAccessibleName(
      expect.stringContaining('已售完'),
    )
    await userEvent.click(soldOut)
    expect(addButton()).toBeDisabled()
    expect(addButton()).toHaveTextContent('已售完')
    await userEvent.click(screen.getByRole('radio', { name: /256GB/ }))
    expect(addButton()).toBeEnabled()
  })

  it('REQ-002#AC6 unknown product shows 「找不到商品」 with a link home', async () => {
    renderRoute('/goods/NO-SUCH-ID')
    expect(await screen.findByRole('heading', { name: '找不到商品' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '回到首頁' })).toHaveAttribute('href', '/')
  })

  it('REQ-002#AC6 load failure shows an error with 「重試」 that recovers', async () => {
    window.history.replaceState(null, '', '/?latency=0&fail=1')
    renderRoute(`/goods/${DEMO.simpleProduct}`)
    const retry = await screen.findByRole('button', { name: '重試' })
    fastMock()
    await userEvent.click(retry)
    expect(
      await screen.findByRole('heading', { level: 1, name: 'AirPods Pro 3' }),
    ).toBeInTheDocument()
  })
})
