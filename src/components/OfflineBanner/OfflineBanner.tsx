import { useOnlineStatus } from '@/hooks/useOnlineStatus'

export function OfflineBanner() {
  const online = useOnlineStatus()
  if (online) return null
  return (
    <div
      role="alert"
      style={{
        padding: 'var(--space-2) var(--space-4)',
        background: 'var(--color-text)',
        color: 'var(--color-bg)',
        textAlign: 'center',
        fontSize: 'var(--fs-sm)',
      }}
    >
      目前處於離線狀態，部分功能可能無法使用。恢復連線後會自動更新。
    </div>
  )
}
