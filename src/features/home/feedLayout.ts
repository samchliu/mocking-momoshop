/**
 * Pure geometry for the home「推薦商品」feed (REQ-005 商品流規格). No DOM access: unit-testable.
 * The numbers mirror the --feed-* tokens in styles/tokens.css (CSS lays out, JS virtualizes).
 */
import { ApiError } from '@/api'

export interface FeedLayout {
  cols: number
  cardH: number
  gap: number
}

/** knowledge: REQ-005 商品流規格「卡片高度」, Q4 / Q19 — keep in sync with tokens.css. */
export const FEED_LAYOUT = {
  wide: { cols: 5, cardH: 380, gap: 16 },
  compact: { cols: 2, cardH: 320, gap: 12 },
} as const satisfies Record<string, FeedLayout>

/** knowledge: REQ-005#AC9 — JS and CSS use the same condition. */
export const WIDE_QUERY = '(min-width: 1024px)'

/** knowledge: REQ-005#AC8 — buffer rows above and below the visible rows. */
export const BUFFER_ROWS = 2

/** knowledge: REQ-005 用語「列高」 = card height + row gap. */
export const rowHeight = (l: FeedLayout) => l.cardH + l.gap

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

/**
 * Rows to render, as [start, end). `listTop` is the list's top relative to the viewport.
 * The visible band is [headerH, viewportH) — the collapsed header covers the top (REQ-005#AC8).
 */
export function visibleRows(g: {
  listTop: number
  viewportH: number
  headerH: number
  rowH: number
  rowCount: number
  buffer?: number
}): { start: number; end: number } {
  const buffer = g.buffer ?? BUFFER_ROWS
  const first = Math.floor((g.headerH - g.listTop) / g.rowH)
  const last = Math.ceil((g.viewportH - g.listTop) / g.rowH)
  const start = clamp(first - buffer, 0, g.rowCount)
  return { start, end: clamp(last + buffer, start, g.rowCount) }
}

/** knowledge: REQ-005 用語「錨定商品」 — first card whose top is at or below the header. */
export function anchorIndex(g: {
  listTop: number
  headerH: number
  rowH: number
  cols: number
  count: number
}): number {
  if (g.count === 0) return 0
  const row = Math.max(0, Math.ceil((g.headerH - g.listTop) / g.rowH))
  return clamp(row * g.cols, 0, g.count - 1)
}

/** knowledge: REQ-005 商品流規格「重複商品」 — keep the first occurrence of each id. */
export function dedupeById<T extends { id: string }>(items: readonly T[]): T[] {
  const seen = new Set<string>()
  return items.filter((i) => !seen.has(i.id) && (seen.add(i.id), true))
}

/**
 * knowledge: REQ-005#AC6 — only 5xx is retried (API-001 錯誤表, max 2). 4xx, network errors and
 * timeouts surface immediately. (The app-wide policy in app/queryClient also retries network/timeout.)
 */
export function shouldRetryFeed(failureCount: number, error: unknown): boolean {
  return (
    failureCount < 2 &&
    error instanceof ApiError &&
    error.kind === 'http' &&
    (error.status ?? 0) >= 500
  )
}
