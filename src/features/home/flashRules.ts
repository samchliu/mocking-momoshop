// knowledge: REQ-003#AC2, BR-001#R5
import { isFlashActive, priceView } from '@/features/catalog'
import { formatPrice } from '@/lib/format'

/** Milliseconds → "hh:mm:ss" (hours not capped at 24); negative values clamp to 00:00:00. */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`
}

export interface FlashPriceView {
  active: boolean
  price: string
  /** Struck-through reference price (original price while active, list price otherwise). */
  originalPrice?: string
}

/** BR-001#R5: the flash price is shown only while startsAt <= now < endsAt; otherwise BR-001 normal price. */
export function flashPriceView(
  item: { price: number; listPrice?: number; flashPrice: number },
  now: Date,
  startsAt: string,
  endsAt: string,
): FlashPriceView {
  if (isFlashActive(now, startsAt, endsAt)) {
    return {
      active: true,
      price: formatPrice(item.flashPrice),
      originalPrice: formatPrice(item.price),
    }
  }
  const v = priceView(item)
  return { active: false, price: v.price, originalPrice: v.listPrice }
}

/** REQ-003 剩餘組數: 「最後N組」, 「已搶完」 when sold out. */
export function stockLabel(remaining: number): string {
  return remaining <= 0 ? '已搶完' : `最後${remaining}組`
}
