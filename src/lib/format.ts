const twd = new Intl.NumberFormat('zh-TW', {
  style: 'currency',
  currency: 'TWD',
  maximumFractionDigits: 0,
})

/** 1234 -> "$1,234" */
export function formatPrice(value: number): string {
  if (!Number.isFinite(value) || value < 0) return '—'
  return twd.format(value).replace(/^NT\$|^\$/, '$')
}

/** Returns the discount as a whole percentage (e.g. 20 for 20% off), or null when not discounted. */
export function discountPercent(price: number, originalPrice?: number): number | null {
  if (!originalPrice || originalPrice <= 0 || price >= originalPrice) return null
  return Math.round((1 - price / originalPrice) * 100)
}
