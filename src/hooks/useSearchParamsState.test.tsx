import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { parsePage, useSearchParamsState } from './useSearchParamsState'

/** Renders the hook inside a real (memory) router so URL updates are observable. */
function setup(initial: string) {
  let router: ReturnType<typeof createMemoryRouter> | undefined
  const { result } = renderHook(() => useSearchParamsState(['q', 'sort', 'page'] as const), {
    wrapper: ({ children }: { children: ReactNode }) => {
      router ??= createMemoryRouter([{ path: '/', element: children }], {
        initialEntries: [initial],
      })
      return <RouterProvider router={router} />
    },
  })
  return { result, search: () => router?.state.location.search ?? '' }
}

describe('useSearchParamsState', () => {
  it('reads values from the URL', () => {
    const { result } = setup('/?q=tv&page=3')
    expect(result.current[0]).toEqual({ q: 'tv', sort: undefined, page: '3' })
  })

  it('resets page when a filter changes', () => {
    const { result, search } = setup('/?q=tv&page=3')
    act(() => result.current[1]({ sort: 'price_asc' }))
    expect(search()).toBe('?q=tv&sort=price_asc')
  })

  it('keeps other params when only the page changes', () => {
    const { result, search } = setup('/?q=tv')
    act(() => result.current[1]({ page: 2 }))
    expect(search()).toBe('?q=tv&page=2')
  })

  it('removes empty values and does not reset page for no-op updates', () => {
    const { result, search } = setup('/?q=tv&page=2')
    act(() => result.current[1]({ q: 'tv' }))
    expect(search()).toBe('?q=tv&page=2')
    act(() => result.current[1]({ q: '' }))
    expect(search()).toBe('')
  })
})

describe('parsePage', () => {
  it.each([
    [undefined, 1],
    ['2', 2],
    ['0', 1],
    ['-1', 1],
    ['1.5', 1],
    ['abc', 1],
  ])('parsePage(%s) = %s', (raw, expected) => {
    expect(parsePage(raw)).toBe(expected)
  })
})
