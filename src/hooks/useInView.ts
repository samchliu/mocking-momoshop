import { useEffect, useRef, useState } from 'react'

/** Becomes true once the element enters (or nears) the viewport, then stays true. */
export function useInView<T extends Element>(rootMargin = '200px') {
  const ref = useRef<T>(null)
  // Without IntersectionObserver support, render immediately (progressive enhancement).
  const [inView, setInView] = useState(() => typeof IntersectionObserver === 'undefined')

  useEffect(() => {
    const el = ref.current
    if (!el || inView) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true)
          io.disconnect()
        }
      },
      { rootMargin },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [inView, rootMargin])

  return { ref, inView }
}
