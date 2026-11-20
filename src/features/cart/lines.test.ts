import { ApiError } from '@/api'
import type { ProductDetail } from '@/features/catalog'
import { cartReducer, emptyCart, parseCart, type CartLine } from './cart'
import {
  lineKey,
  parseQuantityInput,
  resolveLine,
  selectAllNext,
  summarize,
  type LineView,
  type ProductResult,
} from './lines'

const img = { src: 'x.svg', alt: 'x', width: 1, height: 1 }
function product(over: Partial<ProductDetail> = {}): ProductDetail {
  return {
    id: 'A',
    brand: 'B',
    name: '商品A',
    image: img,
    price: 100,
    tags: [],
    salesCount: 0,
    createdAt: '2026-01-01',
    category: [],
    images: [img],
    highlights: [],
    variants: [],
    stock: 10,
    purchaseLimit: 5,
    specs: [],
    ...over,
  }
}
const ok = (data: ProductDetail): ProductResult => ({ status: 'success', data })
const line = (productId: string, quantity: number, variantId: string | null = null): CartLine => ({
  productId,
  variantId,
  quantity,
})

describe('BR-004 品項狀態', () => {
  it('BR-004 載入中、已下架、載入失敗依請求結果判斷', () => {
    expect(resolveLine(line('A', 1), { status: 'pending' }).status).toBe('loading')
    expect(
      resolveLine(line('A', 1), { status: 'error', error: new ApiError('http', 'x', 404) }).status,
    ).toBe('notFound')
    for (const error of [
      new ApiError('http', 'x', 500),
      new ApiError('http', 'x', 400),
      new ApiError('network', 'x'),
      new ApiError('timeout', 'x'),
      new ApiError('parse', 'x'),
    ])
      expect(resolveLine(line('A', 1), { status: 'error', error }).status).toBe('error')
  })

  it('BR-004 E12 variantId 為 null 但商品有選項 → 選項已不存在；不在 variants 中亦同', () => {
    const p = product({ variants: [{ id: 'v1', label: '紅', price: 100, stock: 3 }] })
    expect(resolveLine(line('A', 1), ok(p)).status).toBe('variantMissing')
    expect(resolveLine(line('A', 1, 'v9'), ok(p)).status).toBe('variantMissing')
    expect(resolveLine(line('A', 1, 'v1'), ok(product())).status).toBe('variantMissing')
    expect(resolveLine(line('A', 1, 'v1'), ok(p)).status).toBe('purchasable')
  })

  it('BR-004 E13 purchaseLimit < 1 → 暫不開放購買；庫存 < 1 → 已售完', () => {
    expect(resolveLine(line('A', 1), ok(product({ purchaseLimit: 0 }))).status).toBe('notForSale')
    expect(resolveLine(line('A', 1), ok(product({ stock: 0 }))).status).toBe('soldOut')
  })

  it('REQ-006 品項名稱：選項帶全形括號；無資料時為「商品 {productId}」', () => {
    const p = product({ variants: [{ id: 'v1', label: '紅', price: 100, stock: 3 }] })
    expect(resolveLine(line('A', 1, 'v1'), ok(p)).name).toBe('商品A（紅）')
    expect(resolveLine(line('A', 1), ok(product())).name).toBe('商品A')
    expect(resolveLine(line('A', 1), { status: 'pending' }).name).toBe('商品 A')
    expect(resolveLine(line('A', 1, 'v9'), ok(p)).name).toBe('商品A')
  })
})

describe('BR-004 金額與數量', () => {
  it('BR-004#R7 單價取選項 price，小計 = 單價 × 有效數量', () => {
    const p = product({ variants: [{ id: 'v1', label: '紅', price: 250, stock: 3 }] })
    const v = resolveLine(line('A', 2, 'v1'), ok(p))
    expect(v.unitPrice).toBe(250)
    expect(v.subtotal).toBe(500)
  })

  it('BR-004#R10 E5 儲存數量大於上限時以有效數量計算', () => {
    const v = resolveLine(line('A', 4), ok(product({ stock: 2 })))
    expect(v.limit).toBe(2)
    expect(v.effectiveQuantity).toBe(2)
    expect(v.subtotal).toBe(200)
    expect(v.overLimit).toBe(true)
  })

  it('BR-004#R1 E2 輸入修正：非數字為 1、小數捨去、限制在 1 到上限', () => {
    const cases: Array<[string, number]> = [
      ['0', 1],
      ['-2', 1],
      ['1.7', 1],
      ['2.9', 2],
      ['', 1],
      ['  ', 1],
      ['abc', 1],
      ['1e3', 5],
    ]
    for (const [raw, want] of cases) expect(parseQuantityInput(raw, 5)).toBe(want)
  })
})

describe('BR-004 勾選與總計', () => {
  const a = resolveLine(line('A', 2), ok(product({ id: 'A', price: 100 })))
  const b = resolveLine(line('B', 1), ok(product({ id: 'B', price: 50 })))
  const c = resolveLine(line('C', 1), { status: 'error', error: new ApiError('http', 'x', 404) })
  const d = resolveLine(line('D', 1), { status: 'pending' })

  it('BR-004#R7 BR-004#R8 E3 只計已勾選的可購買品項；結帳品項數為列數', () => {
    const s = summarize([a, b], new Set([b.key]))
    expect(s.total).toBe(200)
    expect(s.checkoutCount).toBe(1)
    expect(s.checkoutDisabled).toBe(false)
  })

  it('BR-004 E4 不可購買品項不計入', () => {
    const s = summarize([a, c], new Set())
    expect(s.total).toBe(200)
    expect(s.checkoutCount).toBe(1)
  })

  it('BR-004#R8 BR-004#R9 E9 有品項載入中時總金額為計算中、結帳停用', () => {
    const s = summarize([a, d], new Set())
    expect(s.total).toBeNull()
    expect(s.checkoutDisabled).toBe(true)
  })

  it('BR-004#R8 E10 全部取消勾選 → $0、結帳(0) 停用', () => {
    const s = summarize([a, b], new Set([a.key, b.key]))
    expect(s.total).toBe(0)
    expect(s.checkoutCount).toBe(0)
    expect(s.checkoutDisabled).toBe(true)
  })

  it('BR-004#R6 全選狀態與點擊', () => {
    expect(summarize([a, b], new Set()).selectAll).toBe('checked')
    expect(summarize([a, b], new Set([a.key])).selectAll).toBe('mixed')
    expect(summarize([a, b], new Set([a.key, b.key])).selectAll).toBe('unchecked')
    expect(summarize([c, d], new Set()).selectAll).toBe('disabled')
    const views: LineView[] = [a, d]
    expect(selectAllNext(views, new Set())).toEqual(new Set([a.key, d.key])) // E11
    expect(selectAllNext(views, new Set([a.key, d.key]))).toEqual(new Set())
  })

  it('BR-004#R7 總金額超過安全整數時為 NaN（顯示 —）', () => {
    const big = resolveLine(
      line('A', 5),
      ok(product({ price: Number.MAX_SAFE_INTEGER - 1, stock: 10 })),
    )
    expect(Number.isNaN(summarize([big], new Set()).total)).toBe(true)
  })
})

describe('BR-004 購物車編輯（reducer）', () => {
  const s0 = [line('A', 1), line('B', 2, 'x'), line('C', 3)].reduce(
    (s, l) => cartReducer(s, { type: 'add', ...l }),
    emptyCart,
  )

  it('BR-004#R2 setQuantity 寫入指定數量', () => {
    const s = cartReducer(s0, { type: 'setQuantity', productId: 'B', variantId: 'x', quantity: 5 })
    expect(s.lines.map((l) => l.quantity)).toEqual([1, 5, 3])
  })

  it('BR-004#R4 E8 移除只刪該列，順序不變；全部刪除清空', () => {
    const s = cartReducer(s0, { type: 'remove', productId: 'B', variantId: 'x' })
    expect(s.lines.map((l) => l.productId)).toEqual(['A', 'C'])
    expect(cartReducer(s0, { type: 'clear' }).lines).toEqual([])
  })

  it('CR-004 BR-003#R6 E7 E8 數量非 ≥1 整數或重複品項 → 格式不符', () => {
    expect(() => parseCart({ lines: [line('A', 0)] })).toThrow('expected integer >= 1')
    expect(() => parseCart({ lines: [line('A', 1.5)] })).toThrow('expected integer >= 1')
    expect(() => parseCart({ lines: [line('A', 1), line('A', 2)] })).toThrow('duplicate line')
    expect(parseCart({ lines: [line('A', 1), line('A', 2, 'x')] }).lines).toHaveLength(2)
  })

  it('lineKey 區分 null 與選項', () => {
    expect(lineKey('A', null)).not.toBe(lineKey('A', ''))
  })
})
