import { useState, type ImgHTMLAttributes } from 'react'

/** Neutral inline placeholder (allowed by CSP img-src data:). */
const FALLBACK_SRC =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 3'%3E%3Crect width='4' height='3' fill='%23eeeeee'/%3E%3C/svg%3E"

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, 'width' | 'height' | 'alt' | 'src'> & {
  src: string
  alt: string
  /** Intrinsic size — required so the browser reserves space (prevents CLS). */
  width: number
  height: number
  /** Set true for the LCP / above-the-fold image only. */
  priority?: boolean
}

export function SmartImage({ priority = false, alt, src, onError, ...rest }: Props) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const failed = failedSrc === src

  return (
    <img
      alt={alt}
      src={failed ? FALLBACK_SRC : src}
      loading={priority ? 'eager' : 'lazy'}
      decoding={priority ? 'sync' : 'async'}
      fetchPriority={priority ? 'high' : 'auto'}
      data-failed={failed || undefined}
      onError={(e) => {
        if (!failed) setFailedSrc(src)
        onError?.(e)
      }}
      {...rest}
    />
  )
}
