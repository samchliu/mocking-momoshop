import { useEffect, useId, useRef, type ReactNode } from 'react'
import styles from './Dialog.module.css'

type Props = {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

/**
 * Native <dialog> modal: the browser provides focus trapping, ESC-to-close (`cancel` event),
 * inert background, top-layer stacking and focus restoration — no library needed.
 */
export function Dialog({ open, onClose, title, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  // Syncing React state with an imperative browser API is a legitimate effect.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  }, [open])

  return (
    // Backdrop click is a mouse-only convenience; keyboard users close via ESC or the close button.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClose={() => open && onClose()}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose() // backdrop click
      }}
    >
      <div className={styles.header}>
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        <button type="button" className={styles.close} onClick={onClose} aria-label="關閉">
          ×
        </button>
      </div>
      <div className={styles.body}>{children}</div>
    </dialog>
  )
}
