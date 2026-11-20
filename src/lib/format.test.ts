import { formatPrice } from './format'

describe('formatPrice', () => {
  it('BR-001#R1 formats with thousands separator and no decimals', () => {
    expect(formatPrice(1234)).toBe('$1,234')
    expect(formatPrice(0)).toBe('$0')
  })
  it('BR-001#R1 guards against invalid numbers', () => {
    expect(formatPrice(Number.NaN)).toBe('—')
    expect(formatPrice(-1)).toBe('—')
  })
})
