// knowledge: BR-003#R2, BR-003#R3 — shared by goods (quantity input) and cart (reducer callers).
export const DEFAULT_PURCHASE_LIMIT = 5

/** Quantity in [1, min(stock, limit)]; 0 means not purchasable (sold out). */
export function clampQuantity(
  value: number,
  { stock, limit }: { stock: number; limit: number },
): number {
  const max = Math.min(stock, limit)
  if (max <= 0) return 0
  const n = Number.isFinite(value) ? Math.floor(value) : 1
  return Math.min(max, Math.max(1, n))
}
