import styles from './Spinner.module.css'

export function Spinner({ label = '載入中' }: { label?: string }) {
  return (
    <output aria-live="polite" className={styles.output}>
      <span className={styles.spinner} aria-hidden="true" />
      <span className="visually-hidden">{label}</span>
    </output>
  )
}
