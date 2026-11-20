// knowledge: BR-002 (search rules) — the mock backend is the single place these rules run.
import type {
  FacetOption,
  ProductSummary,
  SearchCriteria,
  SearchResponse,
  SortOption,
} from '@/features/catalog/types'
import { sanitizeQuery } from '@/lib/sanitize'

export const PAGE_SIZE = 20 // BR-002#R5

/** BR-002#R1: normalise, lower-case and split into tokens. */
export function tokenize(q: string): string[] {
  const n = sanitizeQuery(q).toLowerCase()
  return n ? n.split(' ') : []
}

/** BR-002#R2: every token must appear in brand + name. */
function matches(p: ProductSummary, tokens: string[]): boolean {
  const hay = `${p.brand} ${p.name}`.normalize('NFKC').toLowerCase()
  return tokens.every((t) => hay.includes(t))
}

const byId = (a: ProductSummary, b: ProductSummary) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)

/** BR-002#R3: every comparator ends with the id tie-break, so results are stable across pages. */
function comparator(sort: SortOption, tokens: string[]) {
  const first = tokens[0] ?? ''
  const prefix = (p: ProductSummary) =>
    p.name.toLowerCase().startsWith(first) || p.brand.toLowerCase().startsWith(first) ? 0 : 1
  switch (sort) {
    case 'price_asc':
      return (a: ProductSummary, b: ProductSummary) => a.price - b.price || byId(a, b)
    case 'price_desc':
      return (a: ProductSummary, b: ProductSummary) => b.price - a.price || byId(a, b)
    case 'sales':
      return (a: ProductSummary, b: ProductSummary) => b.salesCount - a.salesCount || byId(a, b)
    case 'newest':
      return (a: ProductSummary, b: ProductSummary) =>
        Date.parse(b.createdAt) - Date.parse(a.createdAt) || byId(a, b)
    case 'relevance':
      return (a: ProductSummary, b: ProductSummary) =>
        prefix(a) - prefix(b) || b.salesCount - a.salesCount || byId(a, b)
  }
}

export function searchProducts(
  catalog: readonly ProductSummary[],
  c: SearchCriteria,
): SearchResponse {
  const tokens = tokenize(c.q)
  // BR-002#R4: reversed range is swapped; bounds inclusive
  let { min, max } = c
  if (min !== undefined && max !== undefined && min > max) [min, max] = [max, min]
  const inPrice = (p: ProductSummary) =>
    (min === undefined || p.price >= min) && (max === undefined || p.price <= max)

  const base = catalog.filter((p) => matches(p, tokens) && inPrice(p))

  // BR-002#R7: brand counts come from results *before* the brand filter
  const counts = new Map<string, number>()
  for (const p of base) counts.set(p.brand, (counts.get(p.brand) ?? 0) + 1)
  const options: FacetOption[] = [...counts]
    .map(([value, count]) => ({ value, label: value, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))

  const brandSet = new Set(c.brands)
  const filtered = brandSet.size ? base.filter((p) => brandSet.has(p.brand)) : base
  const sorted = [...filtered].sort(comparator(c.sort, tokens))

  // BR-002#R5: invalid → 1, overflow → last page
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const page = Number.isInteger(c.page) && c.page >= 1 ? Math.min(c.page, totalPages) : 1
  return {
    items: sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    total: sorted.length,
    page,
    pageSize: PAGE_SIZE,
    totalPages,
    facets: [{ key: 'brand', label: '品牌', options }],
  }
}
