import { useQuery } from '@tanstack/react-query'
import { request } from '@/api'
import { parseHomeResponse } from '@/features/catalog'

export const homeQueryKey = ['home'] as const

/** GET /api/home (API-001), validated by parseHomeResponse; aborted when the page unmounts. */
export function useHomeQuery() {
  return useQuery({
    queryKey: homeQueryKey,
    queryFn: ({ signal }) => request('/api/home', parseHomeResponse, { signal }),
  })
}
