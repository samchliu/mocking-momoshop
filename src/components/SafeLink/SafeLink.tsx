import type { AnchorHTMLAttributes } from 'react'
import { isExternal, safeUrl } from '@/lib/safeUrl'

type Props = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { href: string }

/** Anchor that blocks dangerous URL schemes and hardens external links. */
export function SafeLink({ href, children, ...rest }: Props) {
  const url = safeUrl(href)
  const external = url !== '#' && isExternal(url)
  return (
    <a href={url} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})} {...rest}>
      {children}
    </a>
  )
}
