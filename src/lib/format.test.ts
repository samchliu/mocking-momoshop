import { discountPercent, formatPrice } from './format'

describe('formatPrice', () => {
  it('formats with thousands separator and no decimals', () => {
    expect(formatPrice(1234)).toBe('$1,234')
    expect(formatPrice(0)).toBe('$0')
  })
  it('guards against invalid numbers', () => {
    expect(formatPrice(Number.NaN)).toBe('—')
    expect(formatPrice(-1)).toBe('—')
  })
})

describe('discountPercent', () => {
  it('computes rounded discount', () => {
    expect(discountPercent(80, 100)).toBe(20)
    expect(discountPercent(666, 1000)).toBe(33)
  })
  it('returns null when not discounted', () => {
    expect(discountPercent(100)).toBeNull()
    expect(discountPercent(100, 100)).toBeNull()
    expect(discountPercent(120, 100)).toBeNull()
  })
})
