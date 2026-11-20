import { applyChange, hasFilters, parseCriteria, toApiPath } from './params'

const sp = (s: string) => new URLSearchParams(s)

describe('search URL params (ADR-005)', () => {
  it('REQ-001#AC3 reads keyword, sort, repeated brands and price range from the URL', () => {
    expect(
      parseCriteria('iphone', sp('sort=price_asc&brand=Apple&brand=ESR&min=1000&max=5000&page=2')),
    ).toEqual({
      q: 'iphone',
      sort: 'price_asc',
      brands: ['Apple', 'ESR'],
      min: 1000,
      max: 5000,
      page: 2,
    })
  })

  it('BR-002#R1 normalises the keyword taken from the path', () => {
    expect(parseCriteria('　ＩＰＨＯＮＥ　 15 ', sp('')).q).toBe('IPHONE 15')
  })

  it('BR-002#R5 treats a non-positive-integer page as 1; ignores illegal sort / price values', () => {
    expect(parseCriteria('a', sp('page=abc&sort=cheap&min=-5&max=1.5'))).toEqual({
      q: 'a',
      sort: 'relevance',
      brands: [],
      min: undefined,
      max: undefined,
      page: 1,
    })
    expect(parseCriteria('a', sp('page=0')).page).toBe(1)
  })

  it('REQ-001#AC3 dedupes brands and ignores empty ones', () => {
    expect(parseCriteria('a', sp('brand=ESR&brand=&brand=ESR&brand=Apple')).brands).toEqual([
      'ESR',
      'Apple',
    ])
  })

  it('REQ-001#AC2 BR-002#R6 changing sort writes it to the URL and resets the page', () => {
    expect(applyChange(sp('page=3&brand=Apple'), { sort: 'price_asc' }).toString()).toBe(
      'brand=Apple&sort=price_asc',
    )
  })

  it('BR-002#R6 any filter change resets the page; defaults are not written (ADR-005)', () => {
    expect(applyChange(sp('page=2&sort=sales'), { sort: 'relevance' }).toString()).toBe('')
    expect(applyChange(sp('page=2'), { brands: ['Apple', 'ESR'] }).toString()).toBe(
      'brand=Apple&brand=ESR',
    )
    expect(applyChange(sp('page=2&min=1&max=9'), { min: undefined, max: 500 }).toString()).toBe(
      'max=500',
    )
  })

  it('REQ-001#AC4 page changes keep the other conditions; page 1 is not written', () => {
    expect(applyChange(sp('sort=sales'), { page: 2 }).toString()).toBe('sort=sales&page=2')
    expect(applyChange(sp('sort=sales&page=2'), { page: 1 }).toString()).toBe('sort=sales')
  })

  it('keeps unrelated params (fault injection, debug) untouched', () => {
    expect(applyChange(sp('latency=3000&page=2'), { sort: 'newest' }).toString()).toBe(
      'latency=3000&sort=newest',
    )
  })

  it('REQ-001#AC5 hasFilters is true only for brand / price conditions', () => {
    const base = parseCriteria('a', sp(''))
    expect(hasFilters(base)).toBe(false)
    expect(hasFilters({ ...base, sort: 'sales', page: 3 })).toBe(false)
    expect(hasFilters({ ...base, brands: ['Apple'] })).toBe(true)
    expect(hasFilters({ ...base, max: 100 })).toBe(true)
  })

  it('builds the API-001 request path', () => {
    expect(toApiPath({ q: 'iphone 17', sort: 'sales', brands: ['A', 'B'], min: 1, page: 2 })).toBe(
      '/api/search?q=iphone+17&sort=sales&brand=A&brand=B&min=1&page=2',
    )
  })
})
