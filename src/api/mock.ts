/**
 * In-repo mock backend (no Service Worker → works identically in dev, tests and the production preview).
 *
 * Fault injection for demos / manual QA via URL query:
 *   ?latency=3000      add 3s latency to every request
 *   ?fail=0.3          30% of requests return HTTP 500
 *   ?offline=1         every request fails like a dropped connection
 */
type Handler = (ctx: { url: URL; init: RequestInit; body: unknown }) => Response | Promise<Response>

const routes: Array<{ method: string; pattern: RegExp; handler: Handler }> = []

/** Register a mock endpoint. Pattern is matched against the pathname. */
export function mock(method: string, pattern: RegExp, handler: Handler) {
  routes.push({ method: method.toUpperCase(), pattern, handler })
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export interface FaultConfig {
  latency: number
  failRate: number
  offline: boolean
}

export function readFaultConfig(search: string): FaultConfig {
  const q = new URLSearchParams(search)
  const num = (v: string | null, min: number, max: number, fallback: number) => {
    const n = Number(v)
    return v !== null && Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback
  }
  return {
    latency: num(q.get('latency'), 0, 30_000, 300),
    failRate: num(q.get('fail'), 0, 1, 0),
    offline: q.get('offline') === '1',
  }
}

function delay(ms: number, signal?: AbortSignal | null) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason)
    const t = setTimeout(resolve, ms)
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(t)
        reject(signal.reason)
      },
      { once: true },
    )
  })
}

export async function mockFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const fault = readFaultConfig(typeof window === 'undefined' ? '' : window.location.search)
  const url = new URL(path, 'http://mock.local')
  const method = (init.method ?? 'GET').toUpperCase()

  await delay(fault.latency, init.signal)
  if (fault.offline) throw new TypeError('Failed to fetch')
  if (fault.failRate > 0 && Math.random() < fault.failRate)
    return json({ message: 'Injected failure' }, 500)

  const route = routes.find((r) => r.method === method && r.pattern.test(url.pathname))
  if (!route) return json({ message: 'Not found' }, 404)

  const body = typeof init.body === 'string' ? (JSON.parse(init.body) as unknown) : undefined
  return route.handler({ url, init, body })
}
