/** Mock endpoints implementing docs/api/API-001.md. Loaded lazily on the first request. */
import { SORT_OPTIONS, type SortOption } from '@/features/catalog/types'
import { buildHome, getProductDetail, PRODUCTS } from './data'
import { searchProducts } from './search'
import { json, mock } from './transport'

const SORTS = new Set<string>(SORT_OPTIONS.map((o) => o.value))
const isSort = (v: string): v is SortOption => SORTS.has(v)
const optInt = (v: string | null) =>
  v === null || v === '' ? undefined : /^\d+$/.test(v) ? Number(v) : Number.NaN

mock('GET', /^\/api\/search$/, ({ url }) => {
  const q = url.searchParams
  const sort = q.get('sort') ?? 'relevance'
  const min = optInt(q.get('min'))
  const max = optInt(q.get('max'))
  if (!isSort(sort) || Number.isNaN(min) || Number.isNaN(max))
    return json({ message: 'Invalid parameters' }, 400)
  const page = Number(q.get('page') ?? '1')
  return json(
    searchProducts(PRODUCTS, {
      q: q.get('q') ?? '',
      sort,
      brands: q.getAll('brand'),
      min,
      max,
      page,
    }),
  )
})

mock('GET', /^\/api\/products\/[^/]+$/, ({ url }) => {
  const id = decodeURIComponent(url.pathname.split('/').pop() ?? '')
  const detail = getProductDetail(id)
  return detail ? json(detail) : json({ message: 'Product not found' }, 404)
})

mock('POST', /^\/api\/cart\/items$/, ({ body }) => {
  const b = (typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>
  const { productId, variantId, quantity, inCart } = b
  const isInt = (v: unknown, min: number): v is number =>
    typeof v === 'number' && Number.isInteger(v) && v >= min
  if (
    typeof productId !== 'string' ||
    !(variantId === null || typeof variantId === 'string') ||
    !isInt(quantity, 1) ||
    !isInt(inCart, 0)
  )
    return json({ message: 'Invalid body' }, 400)
  const detail = getProductDetail(productId)
  if (!detail) return json({ message: 'Product not found' }, 404)
  // BR-003#R1: a variant must be chosen when the product has variants
  const variant = detail.variants.find((v) => v.id === variantId)
  if (detail.variants.length > 0 && !variant) return json({ message: 'Variant required' }, 400)
  // BR-003#R7: stock and purchase limit are enforced server-side too
  const max = Math.min(variant ? variant.stock : detail.stock, detail.purchaseLimit)
  if (inCart + quantity > max) return json({ message: 'Exceeds available quantity', max }, 409)
  return json({ productId, variantId: variant?.id ?? null, quantity: inCart + quantity })
})

mock('GET', /^\/api\/home$/, () => json(buildHome()))
