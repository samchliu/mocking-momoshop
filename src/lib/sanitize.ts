const MAX_QUERY_LENGTH = 100

/** Normalises free-text user input (e.g. search box) before it is used in state or URLs. */
export function sanitizeQuery(input: string): string {
  return (
    input
      .normalize('NFKC')
      // eslint-disable-next-line no-control-regex -- intentionally strips control chars
      .replace(/[\u0000-\u001f\u007f<>]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, MAX_QUERY_LENGTH)
  )
}
