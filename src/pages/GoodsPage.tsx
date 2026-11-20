import { useParams } from 'react-router'
import { useAddToCart } from '@/features/cart'
import { ProductView } from '@/features/goods'

/** /goods/:id (REQ-002) — composes the goods view with the cart's add-to-cart mutation. */
export default function GoodsPage() {
  const { id = '' } = useParams()
  const add = useAddToCart()
  return (
    <div className="container">
      <ProductView id={id} onAdd={add.mutate} isAdding={add.isPending} />
    </div>
  )
}
