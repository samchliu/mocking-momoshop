import { useQuery } from '@tanstack/react-query'
import { request } from '@/api'
import { parseProductDetail } from '@/features/catalog'

export const productQueryKey = (id: string) => ['product', id] as const

/** GET /api/products/:id (API-001), validated by the catalog parser. */
export function useProduct(id: string) {
  return useQuery({
    queryKey: productQueryKey(id),
    queryFn: ({ signal }) =>
      request(`/api/products/${encodeURIComponent(id)}`, parseProductDetail, { signal }),
  })
}
