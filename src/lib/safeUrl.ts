const ALLOWED_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:'])

/**
 * Prevents `javascript:` / `data:` and other dangerous schemes from reaching href/src.
 * Relative URLs ("/path", "#id", "?q=") are allowed. Anything unsafe becomes "#".
 */
export function safeUrl(input: string | null | undefined): string {
  if (!input) return '#'
  const value = input.trim()
  if (/^(\/(?!\/)|#|\?)/.test(value)) return value
  try {
    const url = new URL(value)
    return ALLOWED_PROTOCOLS.has(url.protocol) ? url.href : '#'
  } catch {
    return '#'
  }
}

export function isExternal(href: string): boolean {
  try {
    return new URL(href, window.location.origin).origin !== window.location.origin
  } catch {
    return false
  }
}
