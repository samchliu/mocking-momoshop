import { ApiError } from '@/api'
import {
  anchorIndex,
  dedupeById,
  FEED_LAYOUT,
  rowHeight,
  shouldRetryFeed,
  visibleRows,
} from './feedLayout'

describe('feed layout (REQ-005)', () => {
  it('REQ-005 商品流規格：列高 = 卡片高 + 列間距（桌機 396px、平板／手機 332px）', () => {
    expect(FEED_LAYOUT.wide).toMatchObject({ cols: 5, cardH: 380, gap: 16 })
    expect(FEED_LAYOUT.compact).toMatchObject({ cols: 2, cardH: 320, gap: 12 })
    expect(rowHeight(FEED_LAYOUT.wide)).toBe(396)
    expect(rowHeight(FEED_LAYOUT.compact)).toBe(332)
  })

  it('REQ-005#AC8 1280×800、5 欄、100 個商品時，任何捲動位置渲染的卡片 ≤ 35', () => {
    const rowH = rowHeight(FEED_LAYOUT.wide)
    const rowCount = 20
    for (let listTop = 900; listTop >= -rowCount * rowH; listTop -= 7) {
      const { start, end } = visibleRows({ listTop, viewportH: 800, headerH: 56, rowH, rowCount })
      expect(start).toBeGreaterThanOrEqual(0)
      expect(end).toBeLessThanOrEqual(rowCount)
      expect((end - start) * 5).toBeLessThanOrEqual(35)
    }
  })

  it('REQ-005#AC8 可視列上下各保留 2 列緩衝', () => {
    const rowH = 396
    // list scrolled so that row 10 starts exactly under the 56px header
    const listTop = 56 - 10 * rowH
    expect(visibleRows({ listTop, viewportH: 800, headerH: 56, rowH, rowCount: 20 })).toEqual({
      start: 8, // rows 10–11 visible (744px), minus 2 buffer rows
      end: 14, // ceil((800 - listTop) / rowH) = 12, plus 2
    })
  })

  it('REQ-005 用語「錨定商品」：版頭下方第一張完整露出的卡片', () => {
    const rowH = 396
    expect(anchorIndex({ listTop: 56 - 3 * rowH, headerH: 56, rowH, cols: 5, count: 100 })).toBe(15)
    // row 3 partly hidden under the header → anchor is the first card of row 4
    expect(anchorIndex({ listTop: 50 - 3 * rowH, headerH: 56, rowH, cols: 5, count: 100 })).toBe(20)
    // list still below the header → first card
    expect(anchorIndex({ listTop: 600, headerH: 56, rowH, cols: 5, count: 100 })).toBe(0)
    // never past the last item
    expect(anchorIndex({ listTop: -99_999, headerH: 56, rowH, cols: 5, count: 100 })).toBe(99)
  })

  it('REQ-005 商品流規格「重複商品」：保留第一次出現者', () => {
    const a = { id: 'a', n: 1 }
    const b = { id: 'b', n: 2 }
    expect(dedupeById([a, b, { id: 'a', n: 3 }])).toEqual([a, b])
  })

  it('REQ-005#AC6 只有 5xx 依 API-001 自動重試 2 次；4xx、網路錯誤、逾時不重試', () => {
    const http = (status: number) => new ApiError('http', `HTTP ${status}`, status)
    expect(shouldRetryFeed(0, http(500))).toBe(true)
    expect(shouldRetryFeed(1, http(503))).toBe(true)
    expect(shouldRetryFeed(2, http(500))).toBe(false)
    expect(shouldRetryFeed(0, http(400))).toBe(false)
    expect(shouldRetryFeed(0, new ApiError('network', 'down'))).toBe(false)
    expect(shouldRetryFeed(0, new ApiError('timeout', 'slow'))).toBe(false)
  })
})
