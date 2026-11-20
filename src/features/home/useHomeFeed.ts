import { useInfiniteQuery } from '@tanstack/react-query'
import { ApiError, request } from '@/api'
import { parseHomeFeedResponse, type HomeFeedResponse } from '@/features/catalog'
import { shouldRetryFeed } from './feedLayout'

export const homeFeedKey = ['home', 'feed'] as const

/**
 * GET /api/home/feed (API-001, CR-002) as an infinite query.
 * - knowledge: REQ-005 商品流規格「到底」 — the next page comes from the latest successful response;
 *   a response whose `page` differs from the request is treated as a failure.
 * - knowledge: REQ-005 商品流規格「不重複請求」 — staleTime Infinity: loaded pages are never refetched.
 * - knowledge: REQ-005 用語「首頁生命週期」 — gcTime 0: leaving the home page drops the feed, so the
 *   next visit starts again from page 1 — unless `restored` batches are handed back (REQ-005#AC11).
 */
export function useHomeFeed(enabled: boolean, restored?: HomeFeedResponse[]) {
  return useInfiniteQuery({
    queryKey: homeFeedKey,
    queryFn: async ({ pageParam, signal }) => {
      const res = await request(`/api/home/feed?page=${pageParam}`, parseHomeFeedResponse, {
        signal,
      })
      if (res.page !== pageParam)
        throw new ApiError('parse', `feed: expected page ${pageParam}, got ${res.page}`)
      return res
    },
    initialPageParam: 1,
    // knowledge: REQ-005#AC11 — returning batches seed the cache; staleTime Infinity keeps them unfetched.
    initialData: restored?.length
      ? { pages: restored, pageParams: restored.map((p) => p.page) }
      : undefined,
    getNextPageParam: (last) => (last.page >= last.totalPages ? undefined : last.page + 1),
    enabled,
    staleTime: Infinity,
    gcTime: 0,
    retry: shouldRetryFeed,
  })
}
