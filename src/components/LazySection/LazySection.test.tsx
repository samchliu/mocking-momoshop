import { act, render, screen } from '@testing-library/react'
import { LazySection } from './LazySection'

type IOCallback = (entries: Array<{ isIntersecting: boolean }>) => void

describe('LazySection', () => {
  let trigger: IOCallback = () => {}

  beforeEach(() => {
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(cb: IOCallback) {
          trigger = cb
        }
        observe() {}
        disconnect() {}
      },
    )
  })
  afterEach(() => vi.unstubAllGlobals())

  it('renders children only after entering the viewport', () => {
    render(
      <LazySection minHeight={300}>
        <p>below the fold</p>
      </LazySection>,
    )
    expect(screen.queryByText('below the fold')).not.toBeInTheDocument()
    act(() => trigger([{ isIntersecting: true }]))
    expect(screen.getByText('below the fold')).toBeInTheDocument()
  })
})
