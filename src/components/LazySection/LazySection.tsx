import { Suspense, type ReactNode } from 'react'
import { useInView } from '@/hooks/useInView'

type Props = {
  children: ReactNode
  /** Reserved height before content renders — keeps CLS near 0. */
  minHeight: number
  label?: string
}

/**
 * Defers rendering (and, combined with React.lazy, downloading) below-the-fold sections
 * until they approach the viewport.
 */
export function LazySection({ children, minHeight, label }: Props) {
  const { ref, inView } = useInView<HTMLDivElement>()
  return (
    <div ref={ref} style={{ minHeight }} aria-label={label}>
      {inView ? <Suspense fallback={null}>{children}</Suspense> : null}
    </div>
  )
}
