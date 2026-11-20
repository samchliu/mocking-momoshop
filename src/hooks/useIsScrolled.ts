import { useSyncExternalStore } from 'react'

function subscribe(cb: () => void) {
  window.addEventListener('scroll', cb, { passive: true })
  return () => window.removeEventListener('scroll', cb)
}

let last = false

/** A scroll lock pins <body> (`position: fixed`), which resets scrollY to 0 without the user scrolling. */
const scrollLocked = () => document.body.style.position === 'fixed'

function snapshot() {
  // knowledge: REQ-005 版頭規格 — negative scrollY (iOS rubber band) is the top; fractions use `> 0`.
  // knowledge: REQ-005 Q32 — while scrolling is locked, keep the state from before the lock.
  if (!scrollLocked()) last = window.scrollY > 0
  return last
}

/**
 * True once the page has scrolled away from the very top. Read synchronously on the first render,
 * so the initial header state already matches a restored scroll position (REQ-005 版頭規格「初始版型」).
 */
export function useIsScrolled(): boolean {
  return useSyncExternalStore(subscribe, snapshot, () => false)
}
