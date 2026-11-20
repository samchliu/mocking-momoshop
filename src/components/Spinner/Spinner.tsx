import styles from './Spinner.module.css'

export function Spinner({ label = '載入中' }: { label?: string }) {
  return (
    <output aria-live="polite" style={{ display: 'block' }}>
      <span className={styles.spinner} style={{ display: 'block' }} aria-hidden="true" />
      <span className="visually-hidden">{label}</span>
    </output>
  )
}
