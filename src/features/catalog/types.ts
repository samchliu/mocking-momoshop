/** Domain types — mirror of docs/api/API-001.md. Change the doc first, then this file. */
import type { Money } from '@/lib/money'

export interface ImageAsset {
  src: string
  alt: string
  width: number
  height: number
}

export interface ProductSummary {
  id: string
  brand: string
  name: string
  image: ImageAsset
  price: Money
  listPrice?: Money
  priceFrom?: boolean
  promoText?: string
  tags: string[]
  salesCount: number
  rating?: number
  reviewCount?: number
  createdAt: string
}

export interface Variant {
  id: string
  label: string
  price: Money
  listPrice?: Money
  stock: number
}

export interface ProductDetail extends ProductSummary {
  category: Array<{ id: string; label: string }>
  images: ImageAsset[]
  highlights: string[]
  variants: Variant[]
  stock: number
  purchaseLimit: number
  /** 規格表 (API-001, REQ-002#AC11); `[]` when the product has none. */
  specs: SpecRow[]
}

export interface SpecRow {
  label: string
  value: string
}

export type SortOption = 'relevance' | 'sales' | 'newest' | 'price_asc' | 'price_desc'
export const SORT_OPTIONS: ReadonlyArray<{ value: SortOption; label: string }> = [
  { value: 'relevance', label: '綜合推薦' },
  { value: 'sales', label: '銷量' },
  { value: 'newest', label: '新上市' },
  { value: 'price_asc', label: '價格低→高' },
  { value: 'price_desc', label: '價格高→低' },
]

export interface FacetOption {
  value: string
  label: string
  count: number
}
export interface Facet {
  key: 'brand'
  label: string
  options: FacetOption[]
}

export interface SearchCriteria {
  q: string
  sort: SortOption
  brands: string[]
  min?: number
  max?: number
  page: number
}

export interface SearchResponse {
  items: ProductSummary[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  facets: Facet[]
}

export interface FlashSaleItem extends ProductSummary {
  flashPrice: Money
  remaining: number
}

export interface HomeResponse {
  banners: Array<{ id: string; image: ImageAsset; href: string }>
  flashSale: { startsAt: string; endsAt: string; items: FlashSaleItem[] }
  hotKeywords: string[]
  sections: Array<{ id: string; title: string; items: ProductSummary[] }>
}

export interface CartAddResponse {
  productId: string
  variantId: string | null
  quantity: number
}
