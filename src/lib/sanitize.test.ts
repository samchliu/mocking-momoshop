import { sanitizeQuery } from './sanitize'

describe('sanitizeQuery', () => {
  it('trims and collapses whitespace', () => {
    expect(sanitizeQuery('  iphone   15  ')).toBe('iphone 15')
  })
  it('strips angle brackets and control chars', () => {
    expect(sanitizeQuery('<script>x</script>\u0007')).toBe('scriptx/script')
  })
  it('normalises full-width characters', () => {
    expect(sanitizeQuery('ＡＢＣ１２３')).toBe('ABC123')
  })
  it('caps length', () => {
    expect(sanitizeQuery('a'.repeat(500))).toHaveLength(100)
  })
})
