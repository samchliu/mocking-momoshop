import { useLayoutEffect, useRef } from 'react'
import { Link, useMatch } from 'react-router'
import { CartBadge } from '@/features/cart'
import { SearchBox } from '@/features/search'
import { CATEGORIES, categoryHref, currentCategory } from './categories'
import styles from './SiteHeader.module.css'

/**
 * Two-row header (REQ-004#AC2): logo · search · cart, then the category nav.
 * `collapsed` (REQ-005 收合版) hides the category nav but keeps it mounted.
 */
export function SiteHeader({ collapsed = false }: { collapsed?: boolean }) {
  // REQ-004#AC3: only /search/:keyword has a current category
  const match = useMatch('/search/:keyword')
  const current = currentCategory(match?.params.keyword)
  const barRef = useRef<HTMLDivElement>(null)
  const navRef = useRef<HTMLElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const savedScroll = useRef(0)

  useLayoutEffect(() => {
    const nav = navRef.current
    const list = listRef.current
    if (!nav || !list) return
    if (collapsed) {
      // knowledge: REQ-005#AC3 (Q28) — focus inside the nav moves to the search box when it hides.
      // Runs right after commit, before the browser's focus fix-up blurs the now-hidden link.
      if (nav.contains(document.activeElement)) {
        barRef.current?.querySelector<HTMLInputElement>('input[type="search"]')?.focus()
      }
    } else {
      // knowledge: REQ-005#AC2 (Q29) — display:none drops the scroll offset; put it back on expand.
      list.scrollLeft = savedScroll.current
    }
  }, [collapsed])

  return (
    <>
      <div ref={barRef} className={`container ${styles.bar}`}>
        <Link to="/" className={styles.logo} aria-label="momo shop 首頁">
          <span aria-hidden="true">momo</span>
        </Link>
        <SearchBox />
        <CartBadge />
      </div>
      <nav ref={navRef} aria-label="商品分類" className={styles.catNav} hidden={collapsed}>
        <ul
          ref={listRef}
          className={`container ${styles.catList}`}
          onScroll={(e) => {
            savedScroll.current = e.currentTarget.scrollLeft
          }}
        >
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
