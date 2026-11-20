import { useRef, type ReactNode } from 'react'
import { toUserMessage } from '@/api'
import { useFocusReturn } from '@/hooks/useFocusReturn'
import { Button } from '../Button/Button'
import { Spinner } from '../Spinner/Spinner'
import styles from './StatusView.module.css'

type Props = {
  isPending: boolean
  error: unknown
  isEmpty?: boolean
  onRetry?: () => void
  isRetrying?: boolean
  /** Skeleton matching the final layout (preferred over a spinner: avoids CLS). */
  pendingView?: ReactNode
  emptyTitle?: string
  emptyHint?: ReactNode
  children: ReactNode
}

/**
 * One consistent rendering of the async states: pending → error (with retry) → empty → content.
 * Precedence: if data is already shown (e.g. background refetch), keep it instead of flashing a spinner.
 */
export function StatusView({
  isPending,
  error,
  isEmpty = false,
  onRetry,
  isRetrying = false,
  pendingView,
  emptyTitle = '目前沒有資料',
  emptyHint,
  children,
}: Props) {
  const retryRef = useRef<HTMLButtonElement>(null)
  const captureRetryFocus = useFocusReturn(retryRef, isRetrying)

  if (isPending)
    return (
      pendingView ?? (
        <div className={styles.box}>
          <Spinner />
        </div>
      )
    )

  if (error) {
    return (
      <div className={styles.box} role="alert">
        <p className={styles.title}>{toUserMessage(error)}</p>
        {onRetry && (
          <Button
            ref={retryRef}
            variant="secondary"
            pending={isRetrying}
            onClick={() => {
              captureRetryFocus()
              onRetry()
            }}
          >
            {isRetrying ? '重試中…' : '重試'}
          </Button>
        )}
      </div>
    )
  }

  if (isEmpty) {
    return (
      <div className={styles.box}>
        <p className={styles.title}>{emptyTitle}</p>
        {emptyHint}
      </div>
    )
  }

  return <>{children}</>
}
