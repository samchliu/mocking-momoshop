import styles from './SearchResults.module.css'

const PLACEHOLDERS = Array.from({ length: 10 }, (_, i) => i)

/** Skeleton with the same grid as the results, so content swaps in without layout shift (REQ-001#AC6). */
export function ResultsSkeleton() {
  return (
    <output className={styles.skeleton} aria-label="載入中" aria-busy="true">
      <span className="visually-hidden">載入中</span>
      <ul className={styles.grid} aria-hidden="true">
        {PLACEHOLDERS.map((i) => (
          <li key={i} className={styles.skeletonCard}>
            <div className={styles.skeletonImage} />
            <div className={styles.skeletonLine} />
            <div className={`${styles.skeletonLine} ${styles.skeletonShort}`} />
          </li>
        ))}
      </ul>
    </output>
  )
}
