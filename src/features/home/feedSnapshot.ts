/**
 * knowledge: REQ-005#AC11【UX 優化】 — what the home feed remembers when the user leaves for a product
 * page, and the rule for whether coming back may reuse it.
 */
import { parseHomeFeedResponse, type HomeFeedResponse } from '@/features/catalog'
import { arr, int, num, obj } from '@/lib/guard'
import { readStorage, removeStorage, writeStorage } from '@/lib/storage'

export const FEED_SNAPSHOT_KEY = 'momo.homeFeed.v1'
/** knowledge: REQ-005#AC11 — restore only if the user left the home page less than 30 minutes ago. */
export const RESTORE_MAX_AGE_MS = 30 * 60 * 1000

export interface FeedSnapshot {
  /** When the user left the home page (epoch ms). */
  savedAt: number
  /** Index (de-duplicated order) of the anchor product when leaving. */
  anchor: number
  /** Every batch loaded so far, in order. */
  pages: HomeFeedResponse[]
}

export function parseFeedSnapshot(d: unknown): FeedSnapshot {
  const o = obj(d, 'snapshot')
  return {
    savedAt: num(o.savedAt, 'snapshot.savedAt'),
    anchor: int(o.anchor, 'snapshot.anchor', 0),
    pages: arr(o.pages, 'snapshot.pages', parseHomeFeedResponse),
  }
}

export const readFeedSnapshot = () =>
  readStorage<FeedSnapshot | null>(FEED_SNAPSHOT_KEY, parseFeedSnapshot, null, 'session')

export function saveFeedSnapshot(s: FeedSnapshot): void {
  if (s.pages.length === 0) removeStorage(FEED_SNAPSHOT_KEY, 'session')
  else writeStorage(FEED_SNAPSHOT_KEY, s, 'session')
}

const GOODS_PAGE = /^\/goods\/[^/]+$/

/**
 * knowledge: REQ-005#AC11 — reuse the loaded batches only when the user came back with the browser's
 * back/forward (POP) from a product page, in the same tab, within 30 minutes, with no reload in between.
 * Anything else — older, reloaded, back from another page, or entering through a link (PUSH/REPLACE,
 * logo included) — starts again from page 1.
 */
export function restorable(
  s: FeedSnapshot,
  ctx: {
    navigationType: string
    from: string | undefined
    now: number
    reloadedSinceSave: boolean
  },
): boolean {
  const age = ctx.now - s.savedAt
  return (
    ctx.navigationType === 'POP' &&
    ctx.from !== undefined &&
    GOODS_PAGE.test(ctx.from) &&
    !ctx.reloadedSinceSave &&
    age >= 0 &&
    age < RESTORE_MAX_AGE_MS &&
    s.pages.length > 0
  )
}
