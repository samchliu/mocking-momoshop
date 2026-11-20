import { Link } from 'react-router'
import { cartCount } from './cart'
import { useCart } from './context'
import styles from './CartBadge.module.css'

export function CartBadge() {
  const count = cartCount(useCart().state)
  return (
    <Link to="/cart" className={styles.badge} aria-label={`購物車，${count} 件商品`}>
      <svg
        aria-hidden="true"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="9" cy="20" r="1.5" />
        <circle cx="18" cy="20" r="1.5" />
        <path d="M2 3h3l2.6 12.4a1 1 0 0 0 1 .8h9.8a1 1 0 0 0 1-.8L21 7H6" />
      </svg>
      <span className={styles.count} aria-hidden="true" data-empty={count === 0 || undefined}>
        {count > 99 ? '99+' : count}
      </span>
    </Link>
  )
}
