import { useEffect, useRef, type RefObject } from 'react'

/**
 * knowledge: ADR-006 — a native `disabled` (pending) button drops keyboard focus.
 * Pass the button's ref; call the returned `capture()` when the button is activated; when `pending` goes true → false the
 * focus is returned, but only if the button had it, is still mounted and is not disabled, and
 * focus is actually lost (still on <body> or the button) — never steal it back from elsewhere.
 */
export function useFocusReturn(ref: RefObject<HTMLButtonElement | null>, pending: boolean) {
  const hadFocus = useRef(false)
  const wasPending = useRef(pending)

  useEffect(() => {
    if (wasPending.current && !pending) {
      const el = ref.current
      const active = document.activeElement
      const lost = active === null || active === document.body || active === el
      if (hadFocus.current && lost && el?.isConnected && !el.disabled) el.focus()
      hadFocus.current = false
    }
    wasPending.current = pending
  }, [pending, ref])

  return () => {
    hadFocus.current = ref.current !== null && document.activeElement === ref.current
  }
}
