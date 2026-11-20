import type { FlashSaleItem, HomeResponse, ProductSummary } from '@/features/catalog'

/** Test fixtures for the home feature (not shipped: only imported by *.test.tsx). */
export function product(id: string, overrides: Partial<ProductSummary> = {}): ProductSummary {
  return {
    id,
    brand: 'Brand',
    name: `商品 ${id}`,
    image: { src: `data:image/svg+xml,${id}`, alt: `商品 ${id}`, width: 400, height: 400 },
    price: 1000,
    tags: [],
    salesCount: 10,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

export function flashItem(id: string, flashPrice: number, remaining: number): FlashSaleItem {
  return { ...product(id), flashPrice, remaining }
}

export const banners: HomeResponse['banners'] = [
  'iPhone 特賣',
  'Dyson 家電週',
  '保護貼',
  '筆電',
].map((label, i) => ({
  id: `b${i + 1}`,
  image: { src: `data:image/svg+xml,b${i + 1}`, alt: label, width: 1200, height: 400 },
  href: `/search/k${i + 1}`,
}))
