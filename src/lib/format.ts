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
