/**
 * Money is always an integer number of the smallest unit (TWD has no subunit in practice → whole dollars).
 * Never do arithmetic on floats from percentages directly; round once at the boundary.
 */
export type Money = number

export function assertMoney(value: number): Money {
  if (!Number.isSafeInteger(value) || value < 0)
    throw new RangeError(`Invalid money value: ${value}`)
  return value
}

export function lineTotal(unitPrice: Money, quantity: number): Money {
  return assertMoney(assertMoney(unitPrice) * clampInt(quantity, 0, Number.MAX_SAFE_INTEGER))
}

export function sumMoney(values: readonly Money[]): Money {
  return values.reduce<Money>((acc, v) => acc + assertMoney(v), 0)
}

/** Applies a percentage discount (e.g. 15 = 15% off) and rounds once, half-up. */
export function applyPercentOff(price: Money, percent: number): Money {
  const p = Math.min(100, Math.max(0, percent))
  return assertMoney(Math.round((assertMoney(price) * (100 - p)) / 100))
}

/** Clamps a requested quantity into [min, max] and forces an integer (guards NaN / decimals). */
export function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, Math.trunc(value)))
}
