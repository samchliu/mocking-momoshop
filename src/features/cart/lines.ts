// knowledge: BR-004 — cart page line states, quantities and totals. Pure functions, no React.
import { ApiError } from '@/api'
import { clampQuantity, type ProductDetail, type Variant } from '@/features/catalog'
import type { CartLine } from './cart'

export type ProductResult =
  | { status: 'pending' }
  | { status: 'error'; error: unknown }
  | { status: 'success'; data: ProductDetail }

export type LineStatus =
  'loading' | 'notFound' | 'error' | 'variantMissing' | 'notForSale' | 'soldOut' | 'purchasable'

export interface LineView {
  key: string
  line: CartLine
  status: LineStatus
  /** REQ-006 品項名稱 */
  name: string
  product?: ProductDetail
  variant?: Variant
  error?: unknown
  unitPrice?: number
  limit?: number
  /** BR-004 有效數量 (purchasable only) */
  effectiveQuantity?: number
  subtotal?: number
  /** BR-004#R10 */
  overLimit?: boolean
}

export const lineKey = (productId: string, variantId: string | null) =>
  JSON.stringify([productId, variantId])

/** BR-004#R1: non-numbers (incl. blank) → 1, decimals truncated, then [1, limit]. */
export function parseQuantityInput(raw: string, limit: number): number {
  const trimmed = raw.trim()
  const n = trimmed === '' ? Number.NaN : Number(trimmed)
  return clampQuantity(n, { stock: limit, limit })
}

/** BR-004 品項狀態, evaluated in table order. */
export function resolveLine(line: CartLine, result: ProductResult): LineView {
  const key = lineKey(line.productId, line.variantId)
  const fallbackName = `商品 ${line.productId}` // REQ-006 D6
  if (result.status === 'pending') return { key, line, status: 'loading', name: fallbackName }
  if (result.status === 'error') {
    const notFound = result.error instanceof ApiError && result.error.status === 404
    return {
      key,
      line,
      status: notFound ? 'notFound' : 'error',
      name: fallbackName,
      error: result.error,
    }
  }

  const product = result.data
  const variant =
    line.variantId === null ? undefined : product.variants.find((v) => v.id === line.variantId)
  const matches = line.variantId === null ? product.variants.length === 0 : variant !== undefined
  if (!matches) return { key, line, status: 'variantMissing', name: product.name, product }

  const name = variant ? `${product.name}（${variant.label}）` : product.name
  const unitPrice = variant ? variant.price : product.price
  const stock = variant ? variant.stock : product.stock
  const base = { key, line, name, product, variant, unitPrice }
  if (product.purchaseLimit < 1) return { ...base, status: 'notForSale' }
  if (stock < 1) return { ...base, status: 'soldOut' }

  const limit = Math.min(stock, product.purchaseLimit)
  const effectiveQuantity = Math.min(line.quantity, limit)
  return {
    ...base,
    status: 'purchasable',
    limit,
    effectiveQuantity,
    subtotal: unitPrice * effectiveQuantity,
    overLimit: line.quantity > limit,
  }
}

export type SelectAllState = 'checked' | 'mixed' | 'unchecked' | 'disabled'

export interface CartSummary {
  /** null = 計算中 (BR-004#R9); NaN when unsafe (BR-004#R7 → formatPrice shows —) */
  total: number | null
  checkoutCount: number
  checkoutDisabled: boolean
  selectAll: SelectAllState
}

export const isSelected = (v: LineView, deselected: ReadonlySet<string>) =>
  v.status === 'purchasable' && !deselected.has(v.key)

export function summarize(
  views: readonly LineView[],
  deselected: ReadonlySet<string>,
): CartSummary {
  const purchasable = views.filter((v) => v.status === 'purchasable')
  const selected = purchasable.filter((v) => isSelected(v, deselected))
  const anyLoading = views.some((v) => v.status === 'loading')
  const sum = selected.reduce((acc, v) => acc + (v.subtotal ?? 0), 0)
  const total = anyLoading ? null : Number.isSafeInteger(sum) ? sum : Number.NaN
  const checkoutCount = selected.length // BR-004#R8: rows, not quantities
  const selectAll: SelectAllState =
    purchasable.length === 0
      ? 'disabled'
      : selected.length === purchasable.length
        ? 'checked'
        : selected.length === 0
          ? 'unchecked'
          : 'mixed'
  return { total, checkoutCount, checkoutDisabled: checkoutCount === 0 || anyLoading, selectAll }
}

/** BR-004#R6: from checked → deselect every line (any status); otherwise select all. */
export function selectAllNext(
  views: readonly LineView[],
  deselected: ReadonlySet<string>,
): Set<string> {
  return summarize(views, deselected).selectAll === 'checked'
    ? new Set(views.map((v) => v.key))
    : new Set()
}
