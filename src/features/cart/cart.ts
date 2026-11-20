// knowledge: BR-003 (cart rules) — pure functions, no React.
import { arr, int, nullable, obj, str } from '@/lib/guard'

export { clampQuantity, DEFAULT_PURCHASE_LIMIT } from '@/features/catalog/purchase'

export interface CartLine {
  productId: string
  variantId: string | null
  quantity: number
}
export interface CartState {
  lines: CartLine[]
}
export type CartAction =
  | { type: 'add'; productId: string; variantId: string | null; quantity: number }
  | { type: 'revert'; productId: string; variantId: string | null; quantity: number }
  | { type: 'clear' }

export const emptyCart: CartState = { lines: [] }

const same = (l: CartLine, productId: string, variantId: string | null) =>
  l.productId === productId && l.variantId === variantId

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'add': {
      const { productId, variantId, quantity } = action
      if (!state.lines.some((l) => same(l, productId, variantId)))
        return { lines: [...state.lines, { productId, variantId, quantity }] }
      return {
        lines: state.lines.map((l) =>
          same(l, productId, variantId) ? { ...l, quantity: l.quantity + quantity } : l,
        ),
      }
    }
    case 'revert': {
      // BR-003#R5: undo an optimistic add exactly
      const { productId, variantId, quantity } = action
      return {
        lines: state.lines
          .map((l) =>
            same(l, productId, variantId) ? { ...l, quantity: l.quantity - quantity } : l,
          )
          .filter((l) => l.quantity > 0),
      }
    }
    case 'clear':
      return emptyCart
  }
}

export const cartCount = (s: CartState) => s.lines.reduce((n, l) => n + l.quantity, 0)

export const quantityInCart = (s: CartState, productId: string, variantId: string | null) =>
  s.lines.find((l) => same(l, productId, variantId))?.quantity ?? 0

/** BR-003#R6: persisted cart is untrusted input. */
export function parseCart(d: unknown): CartState {
  const o = obj(d, 'cart')
  return {
    lines: arr(o.lines, 'cart.lines', (v, p) => {
      const lo = obj(v, p)
      return {
        productId: str(lo.productId, `${p}.productId`),
        variantId: nullable(lo.variantId, `${p}.variantId`, str),
        quantity: int(lo.quantity, `${p}.quantity`, 1),
      }
    }),
  }
}
