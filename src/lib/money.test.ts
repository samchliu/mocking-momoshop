import { applyPercentOff, assertMoney, clampInt, lineTotal, sumMoney } from './money'

describe('money', () => {
  it('avoids float drift by working in integers', () => {
    // 0.1 + 0.2 problem does not exist for integer dollars
    expect(sumMoney([199, 299, 1])).toBe(499)
    expect(lineTotal(333, 3)).toBe(999)
  })
  it('rejects non-integer or negative amounts', () => {
    expect(() => assertMoney(1.5)).toThrow(RangeError)
    expect(() => assertMoney(-1)).toThrow(RangeError)
    expect(() => assertMoney(Number.NaN)).toThrow(RangeError)
  })
  it('rounds a percentage discount exactly once', () => {
    expect(applyPercentOff(999, 15)).toBe(849) // 849.15 → 849
    expect(applyPercentOff(100, 150)).toBe(0)
    expect(applyPercentOff(100, -10)).toBe(100)
  })
  it('clamps quantities to an integer range', () => {
    expect(clampInt(5, 1, 3)).toBe(3)
    expect(clampInt(0, 1, 3)).toBe(1)
    expect(clampInt(2.7, 1, 3)).toBe(2)
    expect(clampInt(Number.NaN, 1, 3)).toBe(1)
  })
})
