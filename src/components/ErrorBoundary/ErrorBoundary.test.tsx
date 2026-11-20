import { render, screen } from '@testing-library/react'
import { ErrorBoundary } from './ErrorBoundary'

function Boom(): never {
  throw new Error('boom')
}

describe('ErrorBoundary', () => {
  it('renders fallback instead of crashing siblings', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <>
        <ErrorBoundary fallback={<p>暫時無法顯示</p>}>
          <Boom />
        </ErrorBoundary>
        <p>sibling ok</p>
      </>,
    )
    expect(screen.getByText('暫時無法顯示')).toBeInTheDocument()
    expect(screen.getByText('sibling ok')).toBeInTheDocument()
  })
})
