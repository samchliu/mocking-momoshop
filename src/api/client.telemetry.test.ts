import { getEvents, resetTelemetry } from '@/lib/telemetry'
import { request } from './client'
import { json, mock } from './mock'

mock('GET', /^\/tm\/ok$/, () => json({ ok: true }))
mock('GET', /^\/tm\/fail$/, () => json({}, 503))

beforeEach(() => {
  resetTelemetry()
  window.history.replaceState(null, '', '/?latency=0')
})

describe('request() telemetry', () => {
  it('OPS-001 emits an api event per request with status and duration', async () => {
    await request('/tm/ok?q=secret', (d) => d)
    await expect(request('/tm/fail', (d) => d)).rejects.toThrow('HTTP 503')
    expect(getEvents()).toEqual([
      expect.objectContaining({
        type: 'api',
        method: 'GET',
        path: '/tm/ok',
        status: 200,
        durationMs: expect.any(Number),
      }),
      expect.objectContaining({ type: 'api', path: '/tm/fail', status: 503, errorKind: 'http' }),
    ])
  })
})
