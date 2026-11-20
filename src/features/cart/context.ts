import { createContext, useContext, type Dispatch } from 'react'
import type { CartAction, CartState } from './cart'

export interface CartContextValue {
  state: CartState
  dispatch: Dispatch<CartAction>
}
export const CartContext = createContext<CartContextValue | null>(null)

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>')
  return ctx
}
