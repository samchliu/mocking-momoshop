// knowledge: BR-003#R4, BR-003#R5, BR-003#R7
import { useMutation } from '@tanstack/react-query'
import { useRef } from 'react'
import { ApiError, request, toUserMessage } from '@/api'
import { useToast } from '@/components'
import { track } from '@/lib/telemetry'
import { parseCartAddResponse } from '@/features/catalog/parse'
import { quantityInCart } from './cart'
import { useCart } from './context'

export interface AddToCartInput {
  productId: string
  variantId: string | null
  quantity: number
}

/**
 * Add to cart with an optimistic badge update and exact rollback on failure.
 * Returns `isPending` for disabling the button; a ref also guards double clicks that land
 * before React re-renders the disabled state (BR-003#R4).
 */
export function useAddToCart() {
  const { state, dispatch } = useCart()
  const toast = useToast()
  const inFlight = useRef(false)

  const m = useMutation({
    mutationFn: (v: AddToCartInput & { inCart: number }) =>
      request('/api/cart/items', parseCartAddResponse, { method: 'POST', body: v }),
    onMutate: (v) => dispatch({ type: 'add', ...v }), // BR-003#R5 optimistic
    onSuccess: () => {
      track({ type: 'action', name: 'add_to_cart', outcome: 'success' })
      toast.show('已加入購物車', 'success')
    },
    onError: (err, v) => {
      track({ type: 'action', name: 'add_to_cart', outcome: 'failure' })
      dispatch({
        type: 'revert',
        productId: v.productId,
        variantId: v.variantId,
        quantity: v.quantity,
      })
      toast.show(
        err instanceof ApiError && err.status === 409 ? '超過可購買數量' : toUserMessage(err),
        'error',
      )
    },
    onSettled: () => {
      inFlight.current = false
    },
  })

  return {
    isPending: m.isPending,
    mutate: (v: AddToCartInput) => {
      if (inFlight.current) return
      inFlight.current = true
      m.mutate({ ...v, inCart: quantityInCart(state, v.productId, v.variantId) })
    },
  }
}
