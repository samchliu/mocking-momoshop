import { Link } from 'react-router'
import { cartCount, useCart } from '@/features/cart'

/** Minimal cart summary: the cart page and checkout are out of scope (REQ-002「不在範圍內」). */
export default function CartPage() {
  const count = cartCount(useCart().state)
  return (
    <div className="container" style={{ paddingBlock: 'var(--space-8)' }}>
      <h1>購物車</h1>
      <p>目前有 {count} 件商品。完整的購物車與結帳流程不在本次範圍。</p>
      <Link to="/">繼續購物</Link>
    </div>
  )
}
