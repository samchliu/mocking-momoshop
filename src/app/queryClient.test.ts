import { ApiError } from '@/api'
import { createQueryClient } from './queryClient'

describe('query retry policy', () => {
  const retry = createQueryClient().getDefaultOptions().queries?.retry as (
    n: number,
    e: unknown,
  ) => boolean

  it('retries transient failures at most twice', () => {
    const err = new ApiError('network', 'x')
    expect(retry(0, err)).toBe(true)
    expect(retry(1, err)).toBe(true)
    expect(retry(2, err)).toBe(false)
  })
  it('does not retry client errors or unknown errors', () => {
    expect(retry(0, new ApiError('http', 'x', 404))).toBe(false)
    expect(retry(0, new Error('x'))).toBe(false)
  })
})
