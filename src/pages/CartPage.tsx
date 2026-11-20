// Deep import on purpose: the `@/features/cart` barrel is in the entry chunk (header badge),
// so re-exporting CartView there would ship the cart page to every route.
import { CartView } from '@/features/cart/CartView'

/** /cart (REQ-006) */
export default function CartPage() {
  return <CartView />
}
