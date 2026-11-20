import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'

type Primitive = string | number | undefined | null

/**
 * List UI state (keyword / filters / sort / page) lives in the URL:
 * shareable, survives reload, back/forward works, and needs no global store.
 *
 * `update()` resets `page` whenever any other key changes — changing a filter must not leave
 * the user on page 7 of a result set that now has 2 pages.
 */
export function useSearchParamsState<K extends string>(keys: readonly K[]) {
  const [params, setParams] = useSearchParams()

  const values = useMemo(() => {
    const out = {} as Record<K, string | undefined>
    for (const k of keys) out[k] = params.get(k) ?? undefined
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keys are a static list
  }, [params])

  const update = useCallback(
    (patch: Partial<Record<K | 'page', Primitive>>, opts: { replace?: boolean } = {}) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          let touchedNonPage = false
          for (const [k, v] of Object.entries(patch) as Array<[string, Primitive]>) {
            if (
              k !== 'page' &&
              (next.get(k) ?? undefined) !== (v == null || v === '' ? undefined : String(v))
            )
              touchedNonPage = true
            if (v == null || v === '') next.delete(k)
            else next.set(k, String(v))
          }
          if (touchedNonPage && !('page' in patch)) next.delete('page')
          return next
        },
        { replace: opts.replace },
      )
    },
    [setParams],
  )

  return [values, update] as const
}

/** Parses a positive integer page from the URL, defaulting to 1 for anything invalid. */
export function parsePage(raw: string | undefined): number {
  const n = Number(raw)
  return Number.isSafeInteger(n) && n >= 1 ? n : 1
}
