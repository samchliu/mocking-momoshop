import { Link, useLocation } from 'react-router'
import { applyChange } from './params'
import styles from './SearchResults.module.css'

interface Props {
  page: number
  totalPages: number
  label: string
}

/** 「頁數 x/y」 with previous / next (REQ-001#AC4). Real links: shareable, open-in-new-tab works. */
export function Pagination({ page, totalPages, label }: Props) {
  const { search } = useLocation()
  if (totalPages <= 1) return null
  const searchFor = (p: number) => {
    const s = applyChange(new URLSearchParams(search), { page: p }).toString()
    return s ? `?${s}` : ''
  }
  return (
    <nav className={styles.pager} aria-label={label}>
      {page > 1 ? (
        <Link className={styles.pagerLink} to={{ search: searchFor(page - 1) }} rel="prev">
          上一頁
        </Link>
      ) : (
        <span className={styles.pagerLink} aria-disabled="true">
          上一頁
        </span>
      )}
      <span className={styles.pagerStatus}>
        頁數 {page}/{totalPages}
      </span>
      {page < totalPages ? (
        <Link className={styles.pagerLink} to={{ search: searchFor(page + 1) }} rel="next">
          下一頁
        </Link>
      ) : (
        <span className={styles.pagerLink} aria-disabled="true">
          下一頁
        </span>
      )}
    </nav>
  )
}
