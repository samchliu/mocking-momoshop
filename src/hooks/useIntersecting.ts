import { useCallback, useEffect, useState } from 'react'

/**
 * Live "is this element inside the (extended) viewport?" flag — unlike useInView it can turn false again.
 * Returns a callback ref, so it works for elements that mount later.
 * Without IntersectionObserver support it reports true (progressive enhancement).
 */
export function useIntersecting<T extends Element>(rootMargin: string) {
  const [el, setEl] = useState<T | null>(null)
  const [intersecting, setIntersecting] = useState(
    () => typeof IntersectionObserver === 'undefined',
  )

  useEffect(() => {
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      (entries) => {
        const last = entries[entries.length - 1]
        if (last) setIntersecting(last.isIntersecting)
      },
      { rootMargin },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [el, rootMargin])

  const ref = useCallback((node: T | null) => setEl(node), [])
  return { ref, intersecting: el ? intersecting : false }
}
