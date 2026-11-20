// knowledge: BR-001#R4, BR-001#R6, BR-003#R1, BR-003#R2, BR-003#R3
import { clampQuantity, type ProductDetail, type Variant } from '@/features/catalog'

export interface Selection {
  variant: Variant | null
  /** BR-003#R1: product has variants and none is chosen yet. */
  needsVariant: boolean
  /** Input for `priceView` — the chosen variant's price, or the product's 「起」 price. */
  price: { price: number; listPrice?: number; priceFrom: boolean }
  stock: number
  limit: number
  /** BR-003#R2: min(stock, limit); 0 when sold out. */
  maxQuantity: number
  /** BR-003#R3 */
  soldOut: boolean
}

/** Everything the purchase panel derives from (product, chosen variant id) — computed at render. */
export function resolveSelection(product: ProductDetail, variantId: string | null): Selection {
  const variant = product.variants.find((v) => v.id === variantId) ?? null
  const needsVariant = product.variants.length > 0 && variant === null
  const stock = variant ? variant.stock : product.stock
  const limit = product.purchaseLimit
  const maxQuantity = Math.max(0, Math.min(stock, limit))
  return {
    variant,
    needsVariant,
    price: variant
      ? { price: variant.price, listPrice: variant.listPrice, priceFrom: false }
      : {
          price: product.price,
          listPrice: product.listPrice,
          priceFrom: product.priceFrom === true,
        },
    stock,
    limit,
    maxQuantity,
    soldOut: maxQuantity === 0,
  }
}

/** BR-003#R2: free-text quantity → nearest legal value (blank / NaN / decimals → floor, min 1). */
export function quantityFromInput(input: string, limits: { stock: number; limit: number }): number {
  const trimmed = input.trim()
  return clampQuantity(trimmed === '' ? 1 : Number(trimmed), limits)
}
