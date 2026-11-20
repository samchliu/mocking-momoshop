import { useEffect, useReducer, type ReactNode } from 'react'
import { readStorage, writeStorage } from '@/lib/storage'
import { cartReducer, emptyCart, parseCart } from './cart'
import { CartContext } from './context'

export const CART_STORAGE_KEY = 'cart:v1'

/** Client state for the cart (ADR-002): Context + reducer, persisted to localStorage (BR-003#R6). */
export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, undefined, () =>
    readStorage(CART_STORAGE_KEY, parseCart, emptyCart),
  )
  // Persisting is a side effect towards an external system — the legitimate use of an effect.
  useEffect(() => writeStorage(CART_STORAGE_KEY, state), [state])
  return <CartContext value={{ state, dispatch }}>{children}</CartContext>
}
