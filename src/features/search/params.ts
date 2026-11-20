// knowledge: ADR-005 — the URL is the single source of search criteria; this module is its codec.
import { SORT_OPTIONS, type SearchCriteria, type SortOption } from '@/features/catalog'
import { parsePage } from '@/hooks/useSearchParamsState'
import { sanitizeQuery } from '@/lib/sanitize'

const SORTS = new Set<string>(SORT_OPTIONS.map((o) => o.value))
const isSort = (v: string | null): v is SortOption => v !== null && SORTS.has(v)
export const DEFAULT_SORT: SortOption = 'relevance'

/** Non-negative integer or undefined (illegal values are ignored, never sent as a 400). */
function parseAmount(raw: string | null): number | undefined {
  if (raw === null || !/^\d{1,9}$/.test(raw)) return undefined
  return Number(raw)
}

/** URL → criteria. Illegal values fall back to defaults (ADR-005, BR-002#R5). */
export function parseCriteria(keyword: string, params: URLSearchParams): SearchCriteria {
  const sort = params.get('sort')
  return {
    q: sanitizeQuery(keyword), // knowledge: BR-002#R1
    sort: isSort(sort) ? sort : DEFAULT_SORT,
    brands: [...new Set(params.getAll('brand').filter(Boolean))],
    min: parseAmount(params.get('min')),
    max: parseAmount(params.get('max')),
    page: parsePage(params.get('page') ?? undefined), // knowledge: BR-002#R5
  }
}

export interface CriteriaChange {
  sort?: SortOption
  brands?: string[]
  min?: number | undefined
  max?: number | undefined
  page?: number
}

/**
 * Returns the next URL params for a change. Defaults are not written (ADR-005);
 * any change other than `page` resets the page (BR-002#R6). Unrelated params are kept.
 */
export function applyChange(prev: URLSearchParams, change: CriteriaChange): URLSearchParams {
  const next = new URLSearchParams(prev)
  if ('sort' in change) {
    if (!change.sort || change.sort === DEFAULT_SORT) next.delete('sort')
    else next.set('sort', change.sort)
  }
  if ('brands' in change) {
    next.delete('brand')
    for (const b of change.brands ?? []) next.append('brand', b)
  }
  for (const key of ['min', 'max'] as const) {
    if (!(key in change)) continue
    const v = change[key]
    if (v === undefined) next.delete(key)
    else next.set(key, String(v))
  }
  if ('page' in change) {
    if (!change.page || change.page <= 1) next.delete('page')
    else next.set('page', String(change.page))
  } else {
    next.delete('page') // knowledge: BR-002#R6
  }
  return next
}

/** Filters (not sort / page) — what 「清除篩選」 removes (REQ-001#AC5). */
export function hasFilters(c: SearchCriteria): boolean {
  return c.brands.length > 0 || c.min !== undefined || c.max !== undefined
}

/** API-001 `GET /api/search` path for the criteria. */
export function toApiPath(c: SearchCriteria): string {
  const q = new URLSearchParams({ q: c.q, sort: c.sort })
  for (const b of c.brands) q.append('brand', b)
  if (c.min !== undefined) q.set('min', String(c.min))
  if (c.max !== undefined) q.set('max', String(c.max))
  q.set('page', String(c.page))
  return `/api/search?${q.toString()}`
}
