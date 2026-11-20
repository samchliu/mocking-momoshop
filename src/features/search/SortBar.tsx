import { SORT_OPTIONS, type SortOption } from '@/features/catalog'
import styles from './SearchResults.module.css'

interface Props {
  value: SortOption
  onChange: (sort: SortOption) => void
}

/** Sort bar (REQ-001#AC2, BR-002#R3): toggle buttons, current one is aria-pressed. */
export function SortBar({ value, onChange }: Props) {
  return (
    <fieldset className={styles.sortBar}>
      <legend className="visually-hidden">排序</legend>
      {SORT_OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          className={styles.sortButton}
          aria-pressed={o.value === value}
          onClick={() => o.value !== value && onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </fieldset>
  )
}
