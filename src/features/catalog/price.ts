// knowledge: BR-001 (price display rules)
import { formatPrice } from '@/lib/format'

/** BR-001#R2, R3: discount shown only when listPrice > price; floor(ratio × 100). */
export function discountLabel(price: number, listPrice?: number): string | null {
  if (!listPrice || listPrice <= 0 || !(price < listPrice) || price < 0) return null
  const pct = Math.floor((price / listPrice) * 100)
  if (pct >= 100 || pct <= 0) return null
  return pct % 10 === 0 ? `${pct / 10}折` : `${pct}折`
}

/** BR-001#R5: flash price valid while start <= now < end. */
export function isFlashActive(now: Date, startsAt: string, endsAt: string): boolean {
  const t = now.getTime()
  return t >= Date.parse(startsAt) && t < Date.parse(endsAt)
}

export interface PriceView {
  price: string
  listPrice?: string
  discount?: string
  from: boolean
}

/** Everything a component needs to render a price, already following BR-001. */
export function priceView(p: {
  price: number
  listPrice?: number
  priceFrom?: boolean
}): PriceView {
  const discount = discountLabel(p.price, p.listPrice) ?? undefined
  return {
    price: formatPrice(p.price), // BR-001#R1
    listPrice: discount && p.listPrice ? formatPrice(p.listPrice) : undefined,
    discount,
    from: p.priceFrom === true, // BR-001#R6
  }
}

/** "總銷量" style rounding used on product cards. */
export function formatSalesCount(n: number): string {
  if (n >= 10_000) return `>${Math.floor(n / 10_000)}萬`
  if (n >= 1_000) return `>${Math.floor(n / 1_000).toLocaleString('zh-TW')},000`
  return String(n)
}
