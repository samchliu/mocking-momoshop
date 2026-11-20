import { StatusView } from '@/components'
import { FlashSale } from './FlashSale'
import { HomeFeed } from './HomeFeed'
import { HeroCarousel } from './HeroCarousel'
import { HomeSections } from './HomeSections'
import { HotKeywords } from './HotKeywords'
import { useHomeQuery } from './useHomeQuery'
import styles from './HomeView.module.css'

/** Skeleton with the same reserved boxes as the real layout → no layout shift when data arrives. */
function HomeSkeleton() {
  return (
    <div className={styles.skeleton} aria-busy="true" aria-label="首頁載入中">
      <div className={styles.skHero} />
      <div className={styles.skKeywords} />
      <div className={styles.skFlash} />
    </div>
  )
}

/** REQ-003 home content: hero carousel, hot keywords, flash sale, product strips. */
export function HomeView() {
  const { data, isPending, error, refetch, isFetching } = useHomeQuery()
  return (
    <StatusView
      isPending={isPending}
      error={error}
      onRetry={() => void refetch()}
      isRetrying={isFetching}
      pendingView={<HomeSkeleton />}
    >
      {data && (
        <div className={styles.home}>
          <HeroCarousel banners={data.banners} />
          <HotKeywords keywords={data.hotKeywords} />
          <FlashSale sale={data.flashSale} />
          <HomeSections sections={data.sections} />
          {/* knowledge: REQ-005 範圍 — after every product strip (added, not replacing REQ-003) */}
          <HomeFeed />
        </div>
      )}
    </StatusView>
  )
}
