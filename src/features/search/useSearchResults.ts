import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { request } from '@/api'
import { parseHomeResponse, parseSearchResponse, type SearchCriteria } from '@/features/catalog'
import { toApiPath } from './params'

export const searchKey = (c: SearchCriteria) => ['search', c] as const

/**
 * knowledge: REQ-001#AC6 — the key holds every criterion and the request gets the query's signal,
 * so a superseded request is aborted and an older response can never replace a newer one.
 * Previous data is kept as a placeholder only so the filter panel stays put; the result grid shows
 * a skeleton while `isPlaceholderData` is true.
 */
export function useSearchResults(criteria: SearchCriteria) {
  return useQuery({
    queryKey: searchKey(criteria),
    queryFn: ({ signal }) => request(toApiPath(criteria), parseSearchResponse, { signal }),
    placeholderData: keepPreviousData,
    enabled: criteria.q !== '', // knowledge: BR-002#R1 — never search for an empty keyword
  })
}

/** Hot keywords for the no-result state (REQ-001#AC5). Only fetched when needed. */
export function useHotKeywords(enabled: boolean) {
  return useQuery({
    queryKey: ['search', 'hotKeywords'],
    queryFn: ({ signal }) => request('/api/home', parseHomeResponse, { signal }),
    select: (home) => home.hotKeywords,
    enabled,
    staleTime: 5 * 60_000,
  })
}
