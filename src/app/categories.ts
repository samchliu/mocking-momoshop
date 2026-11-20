import { sanitizeQuery } from '@/lib/sanitize'

/** Category nav items (REQ-004 參數): display text and search keyword are the same in this version. */
export const CATEGORIES = [
  'iPhone',
  'Galaxy',
  'Pixel',
  'MacBook',
  'AirPods',
  'Dyson',
  '吹風機',
  '保護貼',
  '手機殼',
].map((label) => ({ label, keyword: label }))

const decode = (s: string) => {
  try {
    return decodeURIComponent(s)
  } catch {
    return s // a literal `%` is not an encoding
  }
}

/**
 * knowledge: REQ-004#AC3 — keyword → URL decode → BR-002#R1 normalise → lower-case, then strict
 * equality with each category keyword. Returns the matching label, or null.
 */
export function currentCategory(keyword: string | undefined): string | null {
  if (keyword === undefined) return null
  const k = sanitizeQuery(decode(keyword)).toLowerCase()
  return CATEGORIES.find((c) => c.keyword.toLowerCase() === k)?.label ?? null
}

/** knowledge: REQ-004#AC2 — keywords already satisfy BR-002#R1, so the href is only encoded. */
export const categoryHref = (keyword: string) => `/search/${encodeURIComponent(keyword)}`
