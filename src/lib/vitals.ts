import { track } from './telemetry'

/**
 * Core Web Vitals via PerformanceObserver (no library): LCP, CLS, and an INP approximation
 * (slowest interaction). Reported when the page is hidden, the moment that matters for real users.
 */
export function observeVitals(): void {
  if (typeof PerformanceObserver === 'undefined') return
  const supported = PerformanceObserver.supportedEntryTypes ?? []
  let lcp = 0
  let cls = 0
  let inp = 0
  const observe = (
    type: string,
    cb: (list: PerformanceObserverEntryList) => void,
    opts: Record<string, unknown> = {},
  ) => {
    if (supported.includes(type))
      new PerformanceObserver(cb).observe({ type, buffered: true, ...opts })
  }
  observe('largest-contentful-paint', (l) => {
    lcp = l.getEntries().at(-1)?.startTime ?? lcp
  })
  observe('layout-shift', (l) => {
    for (const e of l.getEntries()) {
      const shift = e as PerformanceEntry & { value?: number; hadRecentInput?: boolean }
      if (!shift.hadRecentInput) cls += shift.value ?? 0
    }
  })
  observe(
    'event',
    (l) => {
      for (const e of l.getEntries()) inp = Math.max(inp, e.duration)
    },
    { durationThreshold: 40 },
  )

  let reported = false
  addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'hidden' || reported) return
    reported = true
    if (lcp) track({ type: 'vital', name: 'LCP', value: Math.round(lcp) })
    track({ type: 'vital', name: 'CLS', value: Math.round(cls * 1000) / 1000 })
    if (inp) track({ type: 'vital', name: 'INP', value: Math.round(inp) })
  })
}
