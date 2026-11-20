import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { SafeLink, SmartImage } from '@/components'
import type { HomeResponse } from '@/features/catalog'
import { safeUrl } from '@/lib/safeUrl'
import styles from './HeroCarousel.module.css'

type Banner = HomeResponse['banners'][number]

const AUTO_ADVANCE_MS = 5000

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/** Internal hrefs navigate client-side; anything else goes through SafeLink (scheme allow-list). */
function BannerLink({ href, children }: { href: string; children: ReactNode }) {
  const url = safeUrl(href)
  if (url.startsWith('/')) {
    return (
      <Link to={url} className={styles.link}>
        {children}
      </Link>
    )
  }
  return (
    <SafeLink href={url} className={styles.link}>
      {children}
    </SafeLink>
  )
}

/**
 * knowledge: REQ-003#AC1 — hero carousel (no library).
 * - One banner visible at a time; prev/next buttons, dots, ←/→ keys.
 * - Auto-advance pauses on hover / focus, can be paused by the user (WCAG 2.2.2),
 *   and is off under prefers-reduced-motion.
 * - The 3:1 box is reserved in CSS (no CLS); only the first image is `priority` (LCP).
 */
export function HeroCarousel({ banners }: { banners: Banner[] }) {
  const count = banners.length
  const [index, setIndex] = useState(0)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [userPaused, setUserPaused] = useState(false)
  const [reducedMotion] = useState(prefersReducedMotion)
  const rootRef = useRef<HTMLElement>(null)
  const slidesRef = useRef<HTMLDivElement>(null)
  const refocusSlide = useRef(false)

  const autoPlay = count > 1 && !userPaused && !reducedMotion
  const running = autoPlay && !hovered && !focused

  useEffect(() => {
    if (!running) return
    const t = setTimeout(() => setIndex((i) => (i + 1) % count), AUTO_ADVANCE_MS)
    return () => clearTimeout(t)
  }, [running, index, count])

  // Keyboard users switching slides from inside a slide keep focus on the (new) visible link.
  useEffect(() => {
    if (!refocusSlide.current) return
    refocusSlide.current = false
    slidesRef.current?.querySelector<HTMLElement>('[data-active] a')?.focus()
  }, [index])

  // Hover / focus-within pause and ←/→ keys anywhere inside the carousel. Native listeners on the
  // container (it is a landmark, not a widget) — each control stays a real button or link.
  useEffect(() => {
    const root = rootRef.current
    if (!root || count < 2) return
    const enter = () => setHovered(true)
    const leave = () => setHovered(false)
    const focusIn = () => setFocused(true)
    const focusOut = (e: FocusEvent) => {
      if (!(e.relatedTarget instanceof Node && root.contains(e.relatedTarget))) setFocused(false)
    }
    const keyDown = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
      e.preventDefault()
      if (e.target instanceof Node && slidesRef.current?.contains(e.target))
        refocusSlide.current = true
      const step = e.key === 'ArrowRight' ? 1 : -1
      setIndex((i) => (i + step + count) % count)
    }
    root.addEventListener('mouseenter', enter)
    root.addEventListener('mouseleave', leave)
    root.addEventListener('focusin', focusIn)
    root.addEventListener('focusout', focusOut)
    root.addEventListener('keydown', keyDown)
    return () => {
      root.removeEventListener('mouseenter', enter)
      root.removeEventListener('mouseleave', leave)
      root.removeEventListener('focusin', focusIn)
      root.removeEventListener('focusout', focusOut)
      root.removeEventListener('keydown', keyDown)
    }
  }, [count])

  if (count === 0) return null

  const go = (i: number) => setIndex(((i % count) + count) % count)

  return (
    <section
      ref={rootRef}
      className={styles.carousel}
      aria-roledescription="carousel"
      aria-label="主打活動"
    >
      <div ref={slidesRef} className={styles.viewport} aria-live={running ? 'off' : 'polite'}>
        {banners.map((b, i) => (
          <div
            key={b.id}
            className={styles.slide}
            hidden={i !== index}
            data-active={i === index || undefined}
          >
            <BannerLink href={b.href}>
              <SmartImage
                className={styles.image}
                src={b.image.src}
                alt={b.image.alt}
                width={b.image.width}
                height={b.image.height}
                priority={i === 0}
              />
            </BannerLink>
          </div>
        ))}
      </div>

      {count > 1 && (
        <div className={styles.controls}>
          <button
            type="button"
            className={`${styles.arrow} ${styles.prev}`}
            aria-label="上一張"
            onClick={() => go(index - 1)}
          >
            <span aria-hidden="true">‹</span>
          </button>
          <fieldset className={styles.dots}>
            <legend className="visually-hidden">選擇橫幅</legend>
            {banners.map((b, i) => (
              <button
                key={b.id}
                type="button"
                className={styles.dot}
                aria-label={`第 ${i + 1} 張`}
                aria-current={i === index ? 'true' : undefined}
                onClick={() => go(i)}
              />
            ))}
          </fieldset>
          <button
            type="button"
            className={`${styles.arrow} ${styles.next}`}
            aria-label="下一張"
            onClick={() => go(index + 1)}
          >
            <span aria-hidden="true">›</span>
          </button>
          {!reducedMotion && (
            <button
              type="button"
              className={styles.toggle}
              aria-label={userPaused ? '播放輪播' : '暫停輪播'}
              onClick={() => setUserPaused((p) => !p)}
            >
              <span aria-hidden="true">{userPaused ? '▶' : '❚❚'}</span>
            </button>
          )}
        </div>
      )}
    </section>
  )
}
