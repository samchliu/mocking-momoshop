import { render, screen } from '@testing-library/react'
import { SafeLink } from './SafeLink'

describe('SafeLink', () => {
  it('neutralises javascript: urls', () => {
    render(<SafeLink href="javascript:alert(1)">x</SafeLink>)
    expect(screen.getByRole('link', { name: 'x' })).toHaveAttribute('href', '#')
  })
  it('adds noopener to external links', () => {
    render(<SafeLink href="https://example.com">ext</SafeLink>)
    const a = screen.getByRole('link', { name: 'ext' })
    expect(a).toHaveAttribute('target', '_blank')
    expect(a).toHaveAttribute('rel', 'noopener noreferrer')
  })
  it('keeps internal links in the same tab', () => {
    render(<SafeLink href="/p/1">int</SafeLink>)
    expect(screen.getByRole('link', { name: 'int' })).not.toHaveAttribute('target')
  })
})
