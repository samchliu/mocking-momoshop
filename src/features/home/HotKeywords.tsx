import { Link } from 'react-router'
import styles from './HotKeywords.module.css'

/** knowledge: REQ-003#AC4 — each hot keyword links to /search/<keyword> (path-encoded, ADR-005). */
export function HotKeywords({ keywords }: { keywords: string[] }) {
  if (keywords.length === 0) return null
  return (
    <nav className={styles.nav} aria-label="熱門搜尋">
      <span className={styles.label} aria-hidden="true">
        熱搜
      </span>
      <ul className={styles.list}>
        {keywords.map((k) => (
          <li key={k}>
            <Link className={styles.chip} to={`/search/${encodeURIComponent(k)}`}>
              {k}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
