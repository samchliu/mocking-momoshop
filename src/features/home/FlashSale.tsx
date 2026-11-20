import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { SmartImage } from '@/components'
import type { HomeResponse } from '@/features/catalog'
import { flashPriceView, formatCountdown, stockLabel } from './flashRules'
import styles from './FlashSale.module.css'

type Sale = HomeResponse['flashSale']
type Phase = 'upcoming' | 'active' | 'ended'

/** setTimeout delays above 2^31-1 ms overflow; clamp and simply re-evaluate later. */
const MAX_DELAY = 2_147_483_647

/**
 * Re-renders only when the sale crosses a boundary (start / end) — not every second.
 * The per-second ticking lives in <Countdown> so the product list is not re-rendered each tick.
 */
function usePhase(startsAt: string, endsAt: string): { phase: Phase; now: Date } {
  const start = Date.parse(startsAt)
  const end = Date.parse(endsAt)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const next = [start, end].find((b) => b > now)
    if (next === undefined) return
    const t = setTimeout(() => setNow(Date.now()), Math.min(MAX_DELAY, next - now))
    return () => clearTimeout(t)
  }, [now, start, end])

  const phase: Phase = now < start ? 'upcoming' : now < end ? 'active' : 'ended'
  return { phase, now: new Date(now) }
}

/** knowledge: REQ-003#AC2 — hh:mm:ss, updated every second, state kept local to this component. */
function Countdown({ endsAt }: { endsAt: string }) {
  const end = Date.parse(endsAt)
  const [now, setNow] = useState(() => Date.now())
  const remaining = end - now
  const done = remaining <= 0

  useEffect(() => {
    if (done) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [done])

  return (
    <span role="timer" aria-label="距離結束" className={styles.timer}>
      {formatCountdown(remaining)}
    </span>
  )
}

export function FlashSale({ sale }: { sale: Sale }) {
  const { phase, now } = usePhase(sale.startsAt, sale.endsAt)

  return (
    <section className={styles.section} aria-labelledby="flash-sale-title">
      <header className={styles.header}>
        <h2 id="flash-sale-title" className={styles.title}>
          限時搶購
        </h2>
        {phase === 'active' ? (
          <Countdown key={sale.endsAt} endsAt={sale.endsAt} />
        ) : (
          <span className={styles.status}>{phase === 'ended' ? '已結束' : '即將開始'}</span>
        )}
      </header>
      <ul className={styles.strip}>
        {sale.items.map((item) => {
          // knowledge: BR-001#R5 — flash price only inside its window
          const v = flashPriceView(item, now, sale.startsAt, sale.endsAt)
          const soldOut = item.remaining <= 0
          return (
            <li key={item.id} className={styles.item} data-sold-out={soldOut || undefined}>
              <Link to={`/goods/${encodeURIComponent(item.id)}`} className={styles.link}>
                <SmartImage
                  className={styles.image}
                  src={item.image.src}
                  alt=""
                  width={item.image.width}
                  height={item.image.height}
                />
                <h3 className={styles.name}>
                  <span className={styles.brand}>{item.brand}</span> {item.name}
                </h3>
              </Link>
              <p className={styles.prices}>
                <span className={styles.price}>
                  <span className="visually-hidden">{v.active ? '限搶價' : '售價'}</span>
                  <span>{v.price}</span>
                </span>
                {v.originalPrice && (
                  <s className={styles.original}>
                    <span className="visually-hidden">原價</span>
                    <span>{v.originalPrice}</span>
                  </s>
                )}
              </p>
              <p className={soldOut ? styles.soldOut : styles.stock}>
                {stockLabel(item.remaining)}
              </p>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
