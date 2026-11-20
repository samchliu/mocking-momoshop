import { PRODUCTS } from '@/api/mock/data'
import { searchProducts } from '@/api/mock/search'
import { CATEGORIES, currentCategory } from './categories'

describe('category nav data (REQ-004)', () => {
  it.each(CATEGORIES.map((c) => [c.keyword]))(
    'REQ-004#AC5 「%s」 has at least one mock result with default criteria',
    (keyword) => {
      const r = searchProducts(PRODUCTS, { q: keyword, sort: 'relevance', brands: [], page: 1 })
      expect(r.total).toBeGreaterThan(0)
    },
  )

  it('REQ-004#AC3 current category: decode → BR-002#R1 normalise → case-insensitive equality', () => {
    expect(currentCategory('ｉｐｈｏｎｅ')).toBe('iPhone')
    expect(currentCategory('  IPHONE ')).toBe('iPhone')
    expect(currentCategory('%E5%90%B9%E9%A2%A8%E6%A9%9F')).toBe('吹風機')
    expect(currentCategory('iPhone 15')).toBeNull()
    expect(currentCategory(undefined)).toBeNull()
  })
})
