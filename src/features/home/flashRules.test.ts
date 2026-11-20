import { flashPriceView, formatCountdown, stockLabel } from './flashRules'

const item = { price: 1000, listPrice: 1200, flashPrice: 850 }
const startsAt = '2026-11-20T10:00:00.000Z'
const endsAt = '2026-11-20T12:00:00.000Z'

describe('flash sale rules', () => {
  it('REQ-003#AC2 formats the remaining time as hh:mm:ss and clamps at zero', () => {
    expect(formatCountdown(0)).toBe('00:00:00')
    expect(formatCountdown(-5000)).toBe('00:00:00')
    expect(formatCountdown(999)).toBe('00:00:00')
    expect(formatCountdown(1000)).toBe('00:00:01')
    expect(formatCountdown(3_600_000 + 2 * 60_000 + 3_000)).toBe('01:02:03')
    expect(formatCountdown(30 * 3_600_000)).toBe('30:00:00')
  })

  it('BR-001#R5 shows the flash price only while start <= now < end', () => {
    const during = flashPriceView(item, new Date('2026-11-20T11:00:00Z'), startsAt, endsAt)
    expect(during).toEqual({ active: true, price: '$850', originalPrice: '$1,000' })

    const atStart = flashPriceView(item, new Date(startsAt), startsAt, endsAt)
    expect(atStart.active).toBe(true)

    const atEnd = flashPriceView(item, new Date(endsAt), startsAt, endsAt)
    expect(atEnd).toEqual({ active: false, price: '$1,000', originalPrice: '$1,200' })

    const before = flashPriceView(item, new Date('2026-11-20T09:59:59Z'), startsAt, endsAt)
    expect(before.active).toBe(false)
    expect(before.price).toBe('$1,000')
  })

  it('BR-001#R5 outside the window falls back to the normal BR-001 price view', () => {
    const noList = flashPriceView(
      { price: 500, flashPrice: 400 },
      new Date(endsAt),
      startsAt,
      endsAt,
    )
    expect(noList).toEqual({ active: false, price: '$500', originalPrice: undefined })
  })

  it('REQ-003#AC2 remaining sets: 「最後N組」, 「已搶完」 at zero', () => {
    expect(stockLabel(0)).toBe('已搶完')
    expect(stockLabel(1)).toBe('最後1組')
    expect(stockLabel(285)).toBe('最後285組')
  })
})
