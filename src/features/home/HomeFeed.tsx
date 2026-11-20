import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { useNavigationType } from 'react-router'
import { toUserMessage } from '@/api'
import { ProductCard } from '@/features/catalog'
import { useInView } from '@/hooks/useInView'
import { useIntersecting } from '@/hooks/useIntersecting'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { lastRoute, reloadedSince } from '@/lib/routeTrail'
import {
  anchorIndex,
  dedupeById,
  FEED_LAYOUT,
  rowHeight,
  visibleRows,
  WIDE_QUERY,
} from './feedLayout'
import { readFeedSnapshot, restorable, saveFeedSnapshot, type FeedSnapshot } from './feedSnapshot'
import { useHomeFeed } from './useHomeFeed'
import styles from './HomeFeed.module.css'

/** knowledge: REQ-005 用語「觸發區」 — the viewport extended downward by one viewport height. */
const TRIGGER_ZONE = '0px 0px 100% 0px'
const TITLE_ID = 'home-feed-title'

/** Collapsed header height (REQ-005 版頭規格): the band it covers is not "visible" for the feed. */
function readHeaderH() {
  if (typeof window === 'undefined') return 64
  const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h'))
  return Number.isFinite(v) ? v : 64
}

/** REQ-005 首頁「推薦商品」: batch loading (AC5–AC7) + window-scroll virtualization (AC8–AC10). */
export function HomeFeed() {
  const online = useOnlineStatus()
  const navigationType = useNavigationType()
  // knowledge: REQ-005#AC11 — decided once per home lifecycle, on mount. `lastRoute()` is still the
  // page we came from: the route trail is updated in an effect, after this render.
  const [restored] = useState<FeedSnapshot | null>(() => {
    const s = readFeedSnapshot()
    if (!s) return null
    const ctx = {
      navigationType,
      from: lastRoute(),
      now: Date.now(),
      reloadedSinceSave: reloadedSince(s.savedAt),
    }
    return restorable(s, ctx) ? s : null
  })
  // knowledge: REQ-005 商品流規格「第 1 批」 — requested when the reserved row enters the trigger zone
  const { ref: startRef, inView } = useInView<HTMLDivElement>(TRIGGER_ZONE)
  const started = inView || restored !== null
  const feed = useHomeFeed(started && online, restored?.pages)
  const { data, hasNextPage, isFetching, isError, fetchNextPage, refetch } = feed

  const items = dedupeById(data?.pages.flatMap((p) => p.items) ?? [])
  const total = data?.pages.at(-1)?.total ?? items.length
  const first = data?.pages[0]

  // knowledge: REQ-005 商品流規格「下一批／並行／失敗狀態／離線」 — one request at a time; after a
  // failure only the 「重試」 button resumes; offline pauses until the connection is back.
  const { ref: sentinelRef, intersecting } = useIntersecting<HTMLDivElement>(TRIGGER_ZONE)
  const canLoadMore = intersecting && hasNextPage && !isFetching && !isError && online
  const loadedPages = data?.pages.length ?? 0
  useEffect(() => {
    // Triggers TanStack Query (no manual fetching). Re-evaluated after every landed batch
    // (`loadedPages`): when a fast response batches "fetching" and "done" into one render,
    // `canLoadMore` never flips, yet the sentinel may still sit inside the trigger zone.
    if (canLoadMore) void fetchNextPage()
  }, [canLoadMore, loadedPages, fetchNextPage])

  const wide = useMediaQuery(WIDE_QUERY)
  const layout = wide ? FEED_LAYOUT.wide : FEED_LAYOUT.compact
  const rowH = rowHeight(layout)
  const rowCount = Math.ceil(items.length / layout.cols)

  const listRef = useRef<HTMLUListElement>(null)
  const [headerH] = useState(readHeaderH)
  const [view, setView] = useState(() => ({
    listTop: 0,
    viewportH: typeof window === 'undefined' ? 800 : window.innerHeight,
  }))
  const measure = useCallback(() => {
    const el = listRef.current
    if (!el) return
    const listTop = el.getBoundingClientRect().top
    const viewportH = window.innerHeight
    setView((v) =>
      v.listTop === listTop && v.viewportH === viewportH ? v : { listTop, viewportH },
    )
  }, [])
  const hasList = items.length > 0
  useLayoutEffect(() => {
    if (!hasList) return
    measure()
    window.addEventListener('scroll', measure, { passive: true })
    window.addEventListener('resize', measure)
    return () => {
      window.removeEventListener('scroll', measure)
      window.removeEventListener('resize', measure)
    }
  }, [hasList, measure])

  // knowledge: REQ-005#AC9 — when the column count changes, keep the anchor product in view.
  const anchor = anchorIndex({ ...view, headerH, rowH, cols: layout.cols, count: items.length })
  const prev = useRef({ cols: layout.cols, anchor })
  useLayoutEffect(() => {
    const el = listRef.current
    if (el && prev.current.cols !== layout.cols) {
      const row = Math.floor(prev.current.anchor / layout.cols)
      const listDocTop = el.getBoundingClientRect().top + window.scrollY
      // floor: scroll positions are whole pixels; rounding up would tuck the card under the header.
      window.scrollTo(0, Math.floor(listDocTop + row * rowH - headerH))
      prev.current = { cols: layout.cols, anchor: prev.current.anchor }
      return
    }
    prev.current = { cols: layout.cols, anchor }
  }, [layout.cols, anchor, rowH, headerH])

  // knowledge: REQ-005#AC11 — remember the loaded batches and the anchor product when leaving home.
  const pagesRef = useRef(data?.pages)
  pagesRef.current = data?.pages
  useEffect(
    () => () =>
      saveFeedSnapshot({
        savedAt: Date.now(),
        anchor: prev.current.anchor,
        pages: pagesRef.current ?? [],
      }),
    [],
  )
  // knowledge: REQ-005#AC11 — put the anchor product back just below the header. A passive effect runs
  // after the router's own scroll restoration (a layout effect), so this position wins.
  useEffect(() => {
    const el = listRef.current
    if (!restored || !el) return
    const row = Math.floor(restored.anchor / layout.cols)
    const listDocTop = el.getBoundingClientRect().top + window.scrollY
    window.scrollTo(0, Math.floor(listDocTop + row * rowH - headerH))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per home lifecycle
  }, [])

  // knowledge: REQ-005#AC10 — the focused card is never unmounted. Native focusin/focusout on the list
  // (cards stay plain <li>s; the only interactive element in a card is its product link).
  const [focused, setFocused] = useState<number | null>(null)
  useEffect(() => {
    const el = listRef.current
    if (!el) return
    const onIn = (e: FocusEvent) => {
      const li = e.target instanceof Element ? e.target.closest('li') : null
      const pos = Number(li?.getAttribute('aria-posinset'))
      if (!pos) return
      // Focusing scrolls the card into view; re-measure in the same event so the next rows
      // exist before the next Tab press.
      setFocused(pos - 1)
      measure()
    }
    const onOut = (e: FocusEvent) => {
      if (!(e.relatedTarget instanceof Node && el.contains(e.relatedTarget))) setFocused(null)
    }
    el.addEventListener('focusin', onIn)
    el.addEventListener('focusout', onOut)
    return () => {
      el.removeEventListener('focusin', onIn)
      el.removeEventListener('focusout', onOut)
    }
  }, [hasList, measure])

  // knowledge: REQ-005#AC7 — no products at all → the whole section (title included) is not rendered.
  if (first && (first.totalPages === 0 || first.items.length === 0)) return null

  const rows = visibleRows({ ...view, headerH, rowH, rowCount })
  const rendered: number[] = []
  for (let i = rows.start * layout.cols; i < Math.min(rows.end * layout.cols, items.length); i++)
    rendered.push(i)
  if (focused !== null && focused < items.length && !rendered.includes(focused))
    rendered.push(focused)

  const retry = () => void (data ? fetchNextPage() : refetch())

  return (
    <section className={styles.section} aria-labelledby={TITLE_ID}>
      <h2 id={TITLE_ID} className={styles.title}>
        推薦商品
      </h2>
      {hasList ? (
        <>
          <ul
            ref={listRef}
            aria-labelledby={TITLE_ID}
            className={styles.list}
            // row count is runtime data: it sizes the virtualized list (REQ-005#AC8 no height jump)
            // oxlint-disable-next-line react/forbid-dom-props
            style={{ '--rows': rowCount } as CSSProperties}
          >
            {rendered.map((i) => {
              const p = items[i]
              if (!p) return null
              return (
                <li
                  key={p.id}
                  className={styles.item}
                  // grid position is runtime data: absolutely placed card in the virtualized list
                  // oxlint-disable-next-line react/forbid-dom-props
                  style={
                    {
                      '--row': Math.floor(i / layout.cols),
                      '--col': i % layout.cols,
                    } as CSSProperties
                  }
                  aria-setsize={total}
                  aria-posinset={i + 1}
                >
                  <ProductCard product={p} headingLevel={3} />
                </li>
              )
            })}
          </ul>
          <div ref={sentinelRef} className={styles.sentinel} aria-hidden="true" />
        </>
      ) : (
        <div ref={startRef} className={styles.placeholder} />
      )}
      {isError && (
        <div role="alert" className={styles.error}>
          <p>{toUserMessage(feed.error)}</p>
          <button type="button" className={styles.button} onClick={retry} disabled={isFetching}>
            重試
          </button>
        </div>
      )}
      {isFetching && (
        <output aria-label="載入中" className={styles.status}>
          載入中…
        </output>
      )}
      {data && !hasNextPage && !isFetching && !isError && (
        <output aria-label="已經到底了" className={styles.status}>
          已經到底了
        </output>
      )}
    </section>
  )
}
