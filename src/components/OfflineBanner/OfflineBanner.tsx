import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import styles from './OfflineBanner.module.css'

export function OfflineBanner() {
  const online = useOnlineStatus()
  if (online) return null
  return (
    <div role="alert" className={styles.banner}>
      目前處於離線狀態，部分功能可能無法使用。恢復連線後會自動更新。
    </div>
  )
}
