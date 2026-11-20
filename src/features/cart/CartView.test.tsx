import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DEMO } from '@/api/mock/data'
import { fastMock, renderRoute } from '@/test/render'
import { CART_STORAGE_KEY } from './CartProvider'

type Seed = Array<{ productId: string; variantId: string | null; quantity: number }>
const seed = (lines: Seed) => localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ lines }))
const stored = (): Seed =>
  (JSON.parse(localStorage.getItem(CART_STORAGE_KEY) ?? '{"lines":[]}') as { lines: Seed }).lines

const AIRPODS = 'AirPods Pro 3' // P10002: $7,490, stock 3, limit 5
const IPHONE_256 = 'iPhone 17 Pro 原廠公司貨（256GB）' // $39,900, limit 2

async function openCart() {
  const utils = renderRoute('/cart')
  await screen.findByRole('heading', { level: 1, name: '購物車' })
  return utils
}
const items = () =>
  within(screen.getByRole('list', { name: '購物車品項' })).getAllByRole('listitem')
const item = (i: number) => {
  const el = items()[i]
  if (!el) throw new Error(`no item ${i}`)
  return el
}
const checkout = () => screen.getByRole('button', { name: /^結帳\(/ })

beforeEach(() => {
  localStorage.clear()
  fastMock()
})

describe('REQ-006 購物車頁', () => {
  it('REQ-006#AC1 空購物車顯示提示與「去逛逛」，不發出商品請求', async () => {
    const spy = vi.spyOn(await import('@/api/mock'), 'mockFetch')
    await openCart()
    expect(screen.getByText('購物車是空的')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '去逛逛' })).toHaveAttribute('href', '/')
    expect(screen.queryByRole('button', { name: /^結帳/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: '全選' })).not.toBeInTheDocument()
    expect(spy.mock.calls.filter(([p]) => p.startsWith('/api/products/'))).toHaveLength(0)
    spy.mockRestore()
  })

  it('REQ-006#AC2 依儲存順序列出品項；同一商品只請求一次', async () => {
    const spy = vi.spyOn(await import('@/api/mock'), 'mockFetch')
    seed([
      { productId: DEMO.simpleProduct, variantId: null, quantity: 2 },
      { productId: DEMO.variantProduct, variantId: 'P10001-256', quantity: 1 },
      { productId: DEMO.variantProduct, variantId: 'P10001-512', quantity: 1 },
    ])
    await openCart()
    await screen.findByRole('link', { name: AIRPODS })
    expect(items()).toHaveLength(3)
    expect(item(0)).toHaveTextContent(AIRPODS)
    expect(within(item(0)).getByRole('link', { name: AIRPODS })).toHaveAttribute(
      'href',
      `/goods/${DEMO.simpleProduct}`,
    )
    expect(item(0)).toHaveTextContent('$7,490')
    expect(item(0)).toHaveTextContent('$14,980')
    expect(item(1)).toHaveTextContent(IPHONE_256)
    const productCalls = spy.mock.calls.filter(([p]) => p.startsWith('/api/products/'))
    expect(productCalls.map(([p]) => p).sort()).toEqual([
      `/api/products/${DEMO.variantProduct}`,
      `/api/products/${DEMO.simpleProduct}`,
    ])
    spy.mockRestore()
  })

  it('REQ-006#AC3 BR-004#R1 R2 「＋」「−」與輸入框修正並寫入，版頭與金額即時更新', async () => {
    seed([{ productId: DEMO.simpleProduct, variantId: null, quantity: 2 }])
    await openCart()
    const input = await screen.findByRole('textbox', { name: `${AIRPODS} 數量` })
    const plus = screen.getByRole('button', { name: `增加 ${AIRPODS} 數量` })
    const minus = screen.getByRole('button', { name: `減少 ${AIRPODS} 數量` })

    await userEvent.click(plus)
    expect(input).toHaveValue('3')
    expect(plus).toBeDisabled()
    expect(screen.getByRole('link', { name: '購物車，3 件商品' })).toBeInTheDocument()
    expect(screen.getByText('$22,470', { selector: '[data-total]' })).toBeInTheDocument()

    await userEvent.clear(input)
    await userEvent.type(input, '1.7')
    expect(stored()[0]?.quantity).toBe(3) // 輸入中不寫入
    await userEvent.keyboard('{Enter}')
    expect(input).toHaveValue('1')
    expect(minus).toBeDisabled()
    expect(stored()[0]?.quantity).toBe(1)

    await userEvent.clear(input)
    await userEvent.type(input, 'abc')
    await userEvent.tab()
    expect(input).toHaveValue('1')
  })

  it('REQ-006#AC4 BR-004#R3 移除不確認，顯示 toast，焦點移到下一個「移除」；最後一個移除後顯示空購物車', async () => {
    seed([
      { productId: DEMO.simpleProduct, variantId: null, quantity: 1 },
      { productId: DEMO.variantProduct, variantId: 'P10001-256', quantity: 1 },
    ])
    const spy = vi.spyOn(await import('@/api/mock'), 'mockFetch')
    await openCart()
    await screen.findByRole('link', { name: AIRPODS })
    await userEvent.click(screen.getByRole('button', { name: `移除 ${AIRPODS}` }))
    expect(spy.mock.calls.filter(([p]) => p.startsWith('/api/cart'))).toHaveLength(0)
    spy.mockRestore()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(await screen.findByText(`已移除 ${AIRPODS}`)).toBeInTheDocument()
    expect(items()).toHaveLength(1)
    const next = screen.getByRole('button', { name: `移除 ${IPHONE_256}` })
    expect(next).toHaveFocus()

    await userEvent.click(next)
    expect(screen.getByText('購物車是空的')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: '購物車' })).toHaveFocus()
    expect(stored()).toEqual([])
  })

  it('REQ-006#AC5 全部刪除以對話框確認；取消不變，刪除後清空', async () => {
    seed([{ productId: DEMO.simpleProduct, variantId: null, quantity: 1 }])
    await openCart()
    await screen.findByRole('link', { name: AIRPODS })
    await userEvent.click(screen.getByRole('button', { name: '全部刪除' }))
    const dialog = screen.getByRole('dialog', { name: '全部刪除' })
    expect(dialog).toHaveTextContent('確定要刪除購物車中的所有商品嗎？')
    await userEvent.click(within(dialog).getByRole('button', { name: '取消' }))
    expect(items()).toHaveLength(1)

    await userEvent.click(screen.getByRole('button', { name: '全部刪除' }))
    await userEvent.click(
      within(screen.getByRole('dialog', { name: '全部刪除' })).getByRole('button', {
        name: '刪除',
      }),
    )
    expect(screen.getByText('購物車是空的')).toBeInTheDocument()
    expect(await screen.findByText('已清空購物車')).toBeInTheDocument()
    expect(stored()).toEqual([])
  })

  it('REQ-006#AC6 REQ-006#AC7 BR-004#R5 預設全選；取消勾選更新總金額與結帳品項數；結帳顯示尚未開放', async () => {
    seed([
      { productId: DEMO.simpleProduct, variantId: null, quantity: 2 },
      { productId: DEMO.variantProduct, variantId: 'P10001-256', quantity: 1 },
    ])
    await openCart()
    await screen.findByRole('link', { name: AIRPODS })
    const all = screen.getByRole('checkbox', { name: '全選' })
    expect(all).toBeChecked()
    expect(screen.getByText('$54,880', { selector: '[data-total]' })).toBeInTheDocument()
    expect(checkout()).toHaveTextContent('結帳(2)')

    await userEvent.click(screen.getByRole('checkbox', { name: `選取 ${IPHONE_256}` }))
    expect(all).toBePartiallyChecked()
    expect(screen.getByText('$14,980', { selector: '[data-total]' })).toBeInTheDocument()
    expect(checkout()).toHaveTextContent('結帳(1)')

    await userEvent.click(checkout())
    expect(await screen.findByText('結帳功能尚未開放')).toBeInTheDocument()
    expect(stored()).toHaveLength(2)

    await userEvent.click(all) // mixed → 全部勾選
    expect(checkout()).toHaveTextContent('結帳(2)')
    await userEvent.click(all) // 勾選 → 全部取消
    expect(screen.getByText('$0', { selector: '[data-total]' })).toBeInTheDocument()
    expect(checkout()).toHaveTextContent('結帳(0)')
    expect(checkout()).toBeDisabled()
  })

  it('REQ-006#AC8 不可購買品項顯示原因、無勾選框與數量控制、可移除、不計入金額', async () => {
    seed([
      { productId: DEMO.simpleProduct, variantId: null, quantity: 1 },
      { productId: DEMO.soldOutProduct, variantId: null, quantity: 1 },
      { productId: 'NOPE', variantId: null, quantity: 1 },
      { productId: DEMO.variantProduct, variantId: null, quantity: 1 },
    ])
    await openCart()
    expect(await screen.findByText('已售完')).toBeInTheDocument()
    expect(await screen.findByText('商品已下架')).toBeInTheDocument()
    expect(screen.getByText('此選項已不存在')).toBeInTheDocument()
    expect(item(2)).toHaveTextContent('商品 NOPE')
    expect(screen.getAllByRole('checkbox', { name: /^選取/ })).toHaveLength(1)
    expect(screen.getAllByRole('textbox', { name: /數量$/ })).toHaveLength(1)
    expect(screen.getByRole('button', { name: '移除 商品 NOPE' })).toBeEnabled()
    expect(screen.getByText('$7,490', { selector: '[data-total]' })).toBeInTheDocument()
    expect(checkout()).toHaveTextContent('結帳(1)')
    expect(screen.getByRole('link', { name: '購物車，4 件商品' })).toBeInTheDocument()
  })

  it('REQ-006#AC9 REQ-006#AC10 BR-004#R10 BR-004#R11 超過上限以有效數量計算並提示；寫入後提示消失', async () => {
    seed([{ productId: DEMO.simpleProduct, variantId: null, quantity: 5 }])
    await openCart()
    const input = await screen.findByRole('textbox', { name: `${AIRPODS} 數量` })
    expect(input).toHaveValue('3')
    expect(screen.getByText('已超過可購買數量，以 3 件計算')).toBeInTheDocument()
    expect(screen.getByText('$22,470', { selector: '[data-total]' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '購物車，5 件商品' })).toBeInTheDocument()

    await userEvent.clear(input)
    await userEvent.type(input, '3')
    await userEvent.tab()
    expect(screen.queryByText(/已超過可購買數量/)).not.toBeInTheDocument()
    expect(stored()[0]?.quantity).toBe(3)
  })

  it('REQ-006#AC11 BR-004#R9 載入中顯示狀態、總金額為計算中、結帳停用', async () => {
    window.history.replaceState(null, '', '/?latency=10000')
    seed([{ productId: DEMO.simpleProduct, variantId: null, quantity: 1 }])
    await openCart()
    expect(within(item(0)).getByRole('status')).toHaveTextContent('載入中')
    expect(screen.getByText('計算中')).toBeInTheDocument()
    expect(checkout()).toBeDisabled()
    expect(screen.getByRole('button', { name: `移除 商品 ${DEMO.simpleProduct}` })).toBeEnabled()
  })

  it('REQ-006#AC11 載入失敗顯示錯誤與重試；重試成功後恢復', async () => {
    window.history.replaceState(null, '', '/?latency=0&fail=1')
    seed([{ productId: DEMO.simpleProduct, variantId: null, quantity: 1 }])
    await openCart()
    expect(await screen.findByText('服務暫時無法使用，請稍後再試。')).toBeInTheDocument()
    fastMock()
    await userEvent.click(screen.getByRole('button', { name: `重試 商品 ${DEMO.simpleProduct}` }))
    expect(await screen.findByRole('link', { name: AIRPODS })).toBeInTheDocument()
  })

  it('REQ-006#AC11 離線時立即顯示錯誤，不停在載入中', async () => {
    window.history.replaceState(null, '', '/?latency=0&offline=1')
    seed([{ productId: DEMO.simpleProduct, variantId: null, quantity: 1 }])
    await openCart()
    await waitFor(() =>
      expect(screen.getByText('網路連線異常，請確認網路後重試。')).toBeInTheDocument(),
    )
  })
})
