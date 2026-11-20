import { request } from './client'
import { ApiError, toUserMessage } from './errors'
import { json, mock, readFaultConfig } from './mock'

const parseItem = (d: unknown) => {
  if (typeof d === 'object' && d !== null && 'id' in d && typeof d.id === 'string')
    return { id: d.id }
  throw new Error('bad shape')
}

mock('GET', /^\/__test\/item$/, () => json({ id: 'a1' }))
mock('GET', /^\/__test\/bad$/, () => json({ nope: true }))
mock('POST', /^\/__test\/echo$/, ({ body }) => json(body))

function setSearch(search: string) {
  window.history.replaceState(null, '', `/${search}`)
}

describe('request (mock backend)', () => {
  beforeEach(() => setSearch('?latency=0'))

  it('returns parsed, typed data', async () => {
    await expect(request('/__test/item', parseItem)).resolves.toEqual({ id: 'a1' })
  })

  it('sends JSON bodies', async () => {
    await expect(
      request('/__test/echo', (d) => d, { method: 'POST', body: { q: 1 } }),
    ).resolves.toEqual({ q: 1 })
  })

  it('maps unknown routes to http 404', async () => {
    const err = await request('/__test/missing', parseItem).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err).toMatchObject({ kind: 'http', status: 404, retryable: false })
  })

  it('rejects responses that fail validation as parse errors', async () => {
    await expect(request('/__test/bad', parseItem)).rejects.toMatchObject({ kind: 'parse' })
  })

  it('surfaces injected server failures as retryable', async () => {
    setSearch('?latency=0&fail=1')
    await expect(request('/__test/item', parseItem)).rejects.toMatchObject({
      kind: 'http',
      status: 500,
      retryable: true,
    })
  })

  it('reports offline as a network error', async () => {
    setSearch('?latency=0&offline=1')
    await expect(request('/__test/item', parseItem)).rejects.toMatchObject({ kind: 'network' })
  })

  it('aborts in-flight requests (stale response never resolves)', async () => {
    setSearch('?latency=1000')
    const ctrl = new AbortController()
    const p = request('/__test/item', parseItem, { signal: ctrl.signal })
    ctrl.abort()
    await expect(p).rejects.toMatchObject({ kind: 'aborted' })
  })

  it('times out slow requests', async () => {
    setSearch('?latency=1000')
    await expect(request('/__test/item', parseItem, { timeoutMs: 20 })).rejects.toMatchObject({
      kind: 'timeout',
    })
  })
})

describe('readFaultConfig', () => {
  it('clamps and defaults values', () => {
    expect(readFaultConfig('')).toEqual({ latency: 300, failRate: 0, offline: false })
    expect(readFaultConfig('?latency=-5&fail=9&offline=1')).toEqual({
      latency: 0,
      failRate: 1,
      offline: true,
    })
    expect(readFaultConfig('?latency=abc')).toMatchObject({ latency: 300 })
  })
})

describe('toUserMessage', () => {
  it('gives actionable messages per error kind', () => {
    expect(toUserMessage(new ApiError('network', 'x'))).toContain('網路')
    expect(toUserMessage(new ApiError('http', 'x', 409))).toContain('庫存')
    expect(toUserMessage(new Error('x'))).toContain('重新整理')
  })
})
