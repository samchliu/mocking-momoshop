import type { ProductSummary } from '@/features/catalog/types'
import { searchProducts } from './search'

const p = (
  id: string,
  brand: string,
  name: string,
  price: number,
  salesCount = 0,
  createdAt = '2026-01-01',
): ProductSummary => ({
  id,
  brand,
  name,
  price,
  salesCount,
  createdAt,
  tags: [],
  image: { src: '', alt: name, width: 1, height: 1 },
})

const catalog = [
  p('1', 'Apple', 'iPhone 17 Pro 256G', 43900, 500, '2026-09-01'),
  p('2', 'Apple', 'iPhone 17 512G', 35900, 900, '2026-09-10'),
  p('3', 'Samsung', 'Galaxy S26 256G', 28900, 300, '2026-03-01'),
  p('4', 'Samsung', '手機殼 for iPhone', 390, 2000, '2025-12-01'),
  p('5', 'Google', 'Pixel 10 256G', 27900, 100, '2026-08-20'),
]
const base = { q: '', sort: 'relevance' as const, brands: [], page: 1 }

describe('BR-002 mock search engine', () => {
  it('BR-002#R1 normalises the keyword (full-width, spaces) before matching', () => {
    const r = searchProducts(catalog, { ...base, q: '　ＩＰＨＯＮＥ　 17 ' })
    expect(r.items.map((i) => i.id).sort()).toEqual(['1', '2'])
  })

  it('BR-002#R2 requires every token to appear in brand + name (case-insensitive)', () => {
    expect(searchProducts(catalog, { ...base, q: 'apple 512' }).items.map((i) => i.id)).toEqual([
      '2',
    ])
    expect(
      searchProducts(catalog, { ...base, q: 'samsung iphone' }).items.map((i) => i.id),
    ).toEqual(['4'])
  })

  it('BR-002#R3 sorts by the selected option with a stable id tie-break', () => {
    const ids = (sort: Parameters<typeof searchProducts>[1]['sort']) =>
      searchProducts(catalog, { ...base, sort }).items.map((i) => i.id)
    expect(ids('price_asc')).toEqual(['4', '5', '3', '2', '1'])
    expect(ids('price_desc')).toEqual(['1', '2', '3', '5', '4'])
    expect(ids('sales')).toEqual(['4', '2', '1', '3', '5'])
    expect(ids('newest')).toEqual(['2', '1', '5', '3', '4'])
    // relevance: names starting with the first token first, then sales
    expect(searchProducts(catalog, { ...base, q: 'iphone' }).items.map((i) => i.id)).toEqual([
      '2',
      '1',
      '4',
    ])
  })

  it('BR-002#R4 brands are OR-ed, price range is inclusive and swapped when reversed', () => {
    const r = searchProducts(catalog, {
      ...base,
      brands: ['Apple', 'Google'],
      min: 35900,
      max: 27900,
    })
    expect(r.items.map((i) => i.id).sort()).toEqual(['2', '5'])
  })

  it('BR-002#R5 pages by 20 and clamps out-of-range pages', () => {
    const many = Array.from({ length: 45 }, (_, i) => p(String(100 + i), 'X', `item ${i}`, 100 + i))
    expect(searchProducts(many, { ...base, page: 9 })).toMatchObject({
      page: 3,
      totalPages: 3,
      pageSize: 20,
      total: 45,
    })
    expect(searchProducts(many, { ...base, page: 0 }).page).toBe(1)
    expect(searchProducts(many, { ...base, page: 3 }).items).toHaveLength(5)
    expect(searchProducts([], { ...base, page: 4 })).toMatchObject({
      page: 1,
      totalPages: 1,
      total: 0,
    })
  })

  it('BR-002#R7 brand facet counts ignore the brand filter itself', () => {
    const r = searchProducts(catalog, { ...base, q: 'iphone', brands: ['Apple'] })
    expect(r.items).toHaveLength(2)
    expect(r.facets[0]?.options).toEqual([
      { value: 'Apple', label: 'Apple', count: 2 },
      { value: 'Samsung', label: 'Samsung', count: 1 },
    ])
  })
})
