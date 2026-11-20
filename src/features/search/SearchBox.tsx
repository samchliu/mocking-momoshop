import { useNavigate, useParams } from 'react-router'
import { sanitizeQuery } from '@/lib/sanitize'
import styles from './SearchBox.module.css'

/** Header search (REQ-001#AC1). Uncontrolled input; remounts when the URL keyword changes. */
export function SearchBox() {
  const { keyword = '' } = useParams()
  const navigate = useNavigate()
  return (
    <search className={styles.search}>
      <form
        className={styles.form}
        key={keyword}
        onSubmit={(e) => {
          e.preventDefault()
          const raw = new FormData(e.currentTarget).get('q')
          const q = sanitizeQuery(typeof raw === 'string' ? raw : '') // BR-002#R1
          if (!q) return
          navigate(`/search/${encodeURIComponent(q)}`)
        }}
      >
        <input
          className={styles.input}
          type="search"
          name="q"
          aria-label="搜尋商品"
          placeholder="搜尋商品"
          defaultValue={keyword}
          maxLength={100}
          enterKeyHint="search"
          autoComplete="off"
        />
        <button className={styles.button} type="submit">
          搜尋
        </button>
      </form>
    </search>
  )
}
