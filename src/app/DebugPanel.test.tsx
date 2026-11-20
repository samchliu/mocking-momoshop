import { act, render, screen } from '@testing-library/react'
import { resetTelemetry, track } from '@/lib/telemetry'
import DebugPanel from './DebugPanel'

beforeEach(resetTelemetry)

describe('DebugPanel (?debug=1)', () => {
  it('OPS-001 shows live request stats and recent events', () => {
    render(<DebugPanel />)
    expect(screen.getByRole('complementary', { name: 'Telemetry' })).toBeInTheDocument()
    act(() => {
      track({ type: 'api', method: 'GET', path: '/api/search', status: 200, durationMs: 120 })
      track({
        type: 'api',
        method: 'POST',
        path: '/api/cart/items',
        status: 409,
        durationMs: 80,
        errorKind: 'http',
      })
    })
    expect(screen.getByText('2 req · 50% err · 100ms avg')).toBeInTheDocument()
    expect(screen.getByText(/POST \/api\/cart\/items 409/)).toBeInTheDocument()
  })
})
