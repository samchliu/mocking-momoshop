import { Link } from 'react-router'
import { CartBadge } from '@/features/cart'
import { SearchBox } from '@/features/search'
import styles from './SiteHeader.module.css'

export function SiteHeader() {
  return (
    <div className={`container ${styles.bar}`}>
      <Link to="/" className={styles.logo} aria-label="momo shop 首頁">
        <span aria-hidden="true">mo</span>
        <span className={styles.logoMark} aria-hidden="true">
          shop
        </span>
      </Link>
      <SearchBox />
      <CartBadge />
    </div>
  )
}
