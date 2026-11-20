import { QueryClient } from '@tanstack/react-query'
import { ApiError } from '@/api'

/**
 * Server-state policy (one place, explained):
 * - staleTime 30s: list/detail data is reused across navigation instead of refetching → fewer requests.
 * - retry: only transient failures (network/timeout/5xx), max 2, exponential backoff. 4xx are not retried.
 * - no refetch on window focus: avoids request spikes when many users tab back in.
 * - queries are keyed by their params and receive an AbortSignal → switching filters cancels stale requests,
 *   so an old response can never overwrite a newer one.
 */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) =>
          error instanceof ApiError && error.retryable && failureCount < 2,
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 4000),
      },
      mutations: { retry: false },
    },
  })
}
