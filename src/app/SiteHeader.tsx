import { Link, useMatch } from 'react-router'
import { CartBadge } from '@/features/cart'
import { SearchBox } from '@/features/search'
import { CATEGORIES, categoryHref, currentCategory } from './categories'
import styles from './SiteHeader.module.css'

/** Two-row header (REQ-004#AC2): logo · search · cart, then the category nav. */
export function SiteHeader() {
  // REQ-004#AC3: only /search/:keyword has a current category
  const match = useMatch('/search/:keyword')
  const current = currentCategory(match?.params.keyword)
  return (
    <>
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
      <nav aria-label="商品分類" className={styles.catNav}>
        <ul className={`container ${styles.catList}`}>
          {CATEGORIES.map((c) => (
            <li key={c.keyword}>
              <Link
                to={categoryHref(c.keyword)}
                className={styles.catLink}
                aria-current={c.label === current ? 'page' : undefined}
              >
                {c.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  )
}
