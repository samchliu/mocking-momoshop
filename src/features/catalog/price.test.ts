import { discountLabel, isFlashActive, priceView } from './price'

describe('BR-001 price display', () => {
  it('BR-001#R1 formats integer TWD with thousands separator, invalid values as —', () => {
    expect(priceView({ price: 43900 }).price).toBe('$43,900')
    expect(priceView({ price: -1 }).price).toBe('—')
    expect(priceView({ price: Number.NaN }).price).toBe('—')
  })

  it('BR-001#R2 shows list price and discount only when list price is higher', () => {
    expect(priceView({ price: 700, listPrice: 1000 })).toMatchObject({
      listPrice: '$1,000',
      discount: '7折',
    })
    expect(priceView({ price: 1000, listPrice: 1000 })).toMatchObject({
      listPrice: undefined,
      discount: undefined,
    })
    expect(priceView({ price: 1200, listPrice: 1000 }).discount).toBeUndefined()
  })

  it('BR-001#R3 floors the ratio: tens become N折, others two digits', () => {
    expect(discountLabel(700, 1000)).toBe('7折')
    expect(discountLabel(950, 1000)).toBe('95折')
    expect(discountLabel(799, 1000)).toBe('79折')
    expect(discountLabel(1000, 1000)).toBeNull()
    expect(discountLabel(500)).toBeNull()
  })

  it('BR-001#R5 flash price is active only within [start, end)', () => {
    const start = '2026-11-20T10:00:00Z'
    const end = '2026-11-20T12:00:00Z'
    expect(isFlashActive(new Date('2026-11-20T09:59:59Z'), start, end)).toBe(false)
    expect(isFlashActive(new Date('2026-11-20T10:00:00Z'), start, end)).toBe(true)
    expect(isFlashActive(new Date('2026-11-20T12:00:00Z'), start, end)).toBe(false)
  })

  it('BR-001#R6 marks the lowest variant price with 起', () => {
    expect(priceView({ price: 469, priceFrom: true })).toMatchObject({ price: '$469', from: true })
  })
})
