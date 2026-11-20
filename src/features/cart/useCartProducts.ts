// knowledge: BR-004 用語「商品資料」, REQ-006#AC2, REQ-006#AC11
import { useQueries } from '@tanstack/react-query'
import { request } from '@/api'
import { parseProductDetail } from '@/features/catalog'
import type { CartLine } from './cart'
import type { ProductResult } from './lines'

export interface CartProducts {
  results: ReadonlyMap<string, ProductResult>
  retry: (productId: string) => void
}

/**
 * One GET /api/products/:id per distinct productId, shared by all lines of that product.
 * Own query key + gcTime 0: every visit to /cart refetches instead of reusing another page's cache.
 * networkMode 'always': offline fails immediately instead of pausing in "loading".
 */
export function useCartProducts(lines: readonly CartLine[]): CartProducts {
  const ids = [...new Set(lines.map((l) => l.productId))]
  return useQueries({
    queries: ids.map((id) => ({
      queryKey: ['cart-product', id] as const,
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        request(`/api/products/${encodeURIComponent(id)}`, parseProductDetail, { signal }),
      staleTime: 0,
      gcTime: 0,
      networkMode: 'always' as const,
    })),
    combine: (qs) => {
      const results = new Map<string, ProductResult>()
      const refetch = new Map<string, () => void>()
      ids.forEach((id, i) => {
        const q = qs[i]
        if (!q) return
        refetch.set(id, () => void q.refetch())
        if (q.isSuccess) results.set(id, { status: 'success', data: q.data })
        else if (q.isError && !q.isFetching) results.set(id, { status: 'error', error: q.error })
        else results.set(id, { status: 'pending' })
      })
      return { results, retry: (id: string) => refetch.get(id)?.() }
    },
  })
}
