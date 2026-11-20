import { ApiError } from './errors'
import { track } from '@/lib/telemetry'
import { mockFetch } from './mock'

/** Narrowing function that validates unknown JSON into a typed value (throws on mismatch). */
export type Parser<T> = (data: unknown) => T

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  signal?: AbortSignal
  timeoutMs?: number
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''
const USE_MOCK = !BASE_URL
const DEFAULT_TIMEOUT = 8000

/** `AbortSignal.any` with a fallback for browsers that lack it (Safari < 17.4). */
function anySignal(signals: AbortSignal[]): AbortSignal {
  if (typeof AbortSignal.any === 'function') return AbortSignal.any(signals)
  const ctrl = new AbortController()
  for (const s of signals) {
    if (s.aborted) {
      ctrl.abort(s.reason)
      break
    }
    s.addEventListener('abort', () => ctrl.abort(s.reason), { once: true })
  }
  return ctrl.signal
}

/**
 * The only place that talks to the network.
 * - Typed: every call passes a Parser, so API responses never leak `any` into the app.
 * - Cancellable: honours AbortSignal (TanStack Query passes one per query → stale requests are aborted).
 * - Bounded: per-request timeout.
 * - Uniform errors: everything surfaces as ApiError.
 */
/** Every request is measured once here (OPS-001): path, status, duration, error kind. */
export async function request<T>(
  path: string,
  parse: Parser<T>,
  opts: RequestOptions = {},
): Promise<T> {
  const started = performance.now()
  const method = opts.method ?? 'GET'
  const durationMs = () => Math.round(performance.now() - started)
  try {
    const data = await send(path, parse, opts)
    track({ type: 'api', method, path, status: 200, durationMs: durationMs() })
    return data
  } catch (err) {
    if (err instanceof ApiError && err.kind !== 'aborted')
      track({
        type: 'api',
        method,
        path,
        status: err.status,
        durationMs: durationMs(),
        errorKind: err.kind,
      })
    throw err
  }
}

async function send<T>(path: string, parse: Parser<T>, opts: RequestOptions): Promise<T> {
  const { method = 'GET', body, signal, timeoutMs = DEFAULT_TIMEOUT } = opts

  const timeout = AbortSignal.timeout(timeoutMs)
  const combined = signal ? anySignal([signal, timeout]) : timeout
  const init: RequestInit = {
    method,
    signal: combined,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  }

  let res: Response
  try {
    res = USE_MOCK ? await mockFetch(path, init) : await fetch(`${BASE_URL}${path}`, init)
  } catch (err) {
    if (signal?.aborted) throw new ApiError('aborted', 'Request aborted')
    if (timeout.aborted) throw new ApiError('timeout', `Request timed out after ${timeoutMs}ms`)
    throw new ApiError('network', err instanceof Error ? err.message : 'Network error')
  }

  if (!res.ok) throw new ApiError('http', `HTTP ${res.status}`, res.status)

  let json: unknown
  try {
    json = res.status === 204 ? undefined : await res.json()
  } catch {
    throw new ApiError('parse', 'Invalid JSON')
  }
  try {
    return parse(json)
  } catch (err) {
    throw new ApiError('parse', err instanceof Error ? err.message : 'Unexpected response shape')
  }
}
