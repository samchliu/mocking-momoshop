import { getEvents, resetTelemetry, subscribe, summarize, track } from './telemetry'

beforeEach(resetTelemetry)

describe('telemetry event bus (OPS-001)', () => {
  it('OPS-001 records events with a timestamp and notifies subscribers', () => {
    const seen: string[] = []
    const off = subscribe(() => seen.push(getEvents().at(-1)?.type ?? ''))
    track({ type: 'action', name: 'add_to_cart', outcome: 'success' })
    off()
    track({ type: 'action', name: 'add_to_cart', outcome: 'failure' })
    expect(seen).toEqual(['action'])
    expect(getEvents()).toHaveLength(2)
    expect(getEvents()[0]?.at).toEqual(expect.any(Number))
  })

  it('OPS-001 keeps a bounded buffer and a stable snapshot between changes', () => {
    for (let i = 0; i < 80; i++) track({ type: 'vital', name: 'CLS', value: i })
    const a = getEvents()
    expect(a).toHaveLength(50)
    expect(getEvents()).toBe(a)
    expect(a.at(-1)).toMatchObject({ value: 79 })
  })

  it('OPS-001 drops the query string from api paths (search keywords may contain PII)', () => {
    track({
      type: 'api',
      method: 'GET',
      path: '/api/search?q=0912345678',
      status: 200,
      durationMs: 10,
    })
    expect(getEvents()[0]).toMatchObject({ path: '/api/search' })
  })

  it('OPS-001 summarises request count, error rate and latency', () => {
    track({ type: 'api', method: 'GET', path: '/a', status: 200, durationMs: 100 })
    track({
      type: 'api',
      method: 'GET',
      path: '/a',
      status: 500,
      durationMs: 300,
      errorKind: 'http',
    })
    track({ type: 'action', name: 'x', outcome: 'success' })
    expect(summarize(getEvents())).toEqual({
      requests: 2,
      errors: 1,
      errorRate: 0.5,
      avgLatencyMs: 200,
    })
    expect(summarize([])).toEqual({ requests: 0, errors: 0, errorRate: 0, avgLatencyMs: 0 })
  })
})
