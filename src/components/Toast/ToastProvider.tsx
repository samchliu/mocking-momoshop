import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { ToastContext, type ToastApi, type ToastTone } from './context'
import styles from './Toast.module.css'

interface ToastItem {
  id: number
  message: string
  tone: ToastTone
}

const DURATION = 3000
const MAX_VISIBLE = 3

/** Operation feedback (e.g. "已加入購物車"). Announced to screen readers via aria-live. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const nextId = useRef(0)

  const show = useCallback<ToastApi['show']>((message, tone = 'info') => {
    const id = ++nextId.current
    setItems((prev) => [...prev.slice(-(MAX_VISIBLE - 1)), { id, message, tone }])
    window.setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), DURATION)
  }, [])

  const api = useMemo(() => ({ show }), [show])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <output className={styles.region} aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`${styles.toast} ${t.tone === 'error' ? styles.error : ''}`}>
            {t.message}
          </div>
        ))}
      </output>
    </ToastContext.Provider>
  )
}
