/**
 * In-memory trail of the routes this document has shown (one tab, one page load).
 * A reload or a new tab starts empty, so "where did the user come from" never leaks across loads.
 */
let current: string | undefined

/** Record the route that was just committed (call from an effect; idempotent). */
export function noteRoute(pathname: string): void {
  current = pathname
}

/**
 * The last committed route. Read while rendering a new route, before its own `noteRoute` effect
 * runs, this is the page the user came from.
 */
export function lastRoute(): string | undefined {
  return current
}

/** True when this document was loaded by a reload that happened after `time` (epoch ms). */
export function reloadedSince(time: number): boolean {
  if (typeof performance === 'undefined' || typeof performance.getEntriesByType !== 'function')
    return false
  const [nav] = performance.getEntriesByType('navigation')
  // PerformanceNavigationTiming is missing in some environments (jsdom): read `type` structurally.
  const type = nav && 'type' in nav ? nav.type : undefined
  return type === 'reload' && performance.timeOrigin > time
}
