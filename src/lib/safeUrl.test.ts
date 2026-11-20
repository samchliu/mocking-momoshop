import { isExternal, safeUrl } from './safeUrl'

describe('safeUrl', () => {
  it.each(['/products/1', '#top', '?q=tv'])('keeps relative url %s', (u) => {
    expect(safeUrl(u)).toBe(u)
  })
  it('keeps http(s)', () => {
    expect(safeUrl('https://example.com/a')).toBe('https://example.com/a')
  })
  it.each([
    'javascript:alert(1)',
    ' JaVaScRiPt:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:x',
    '//evil.com',
    '',
    null,
    undefined,
  ])('blocks unsafe input %s', (u) => {
    expect(safeUrl(u)).toBe('#')
  })
})

describe('isExternal', () => {
  it('detects other origins', () => {
    expect(isExternal('https://example.com')).toBe(true)
    expect(isExternal('/local')).toBe(false)
  })
})
