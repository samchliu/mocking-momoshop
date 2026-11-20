import { mockFetch as transportFetch } from './transport'

export { json, mock, readFaultConfig, type FaultConfig } from './transport'

let ready: Promise<unknown> | undefined
/** Mock data + handlers are code-split: they load on the first request, not in the entry chunk. */
export async function mockFetch(path: string, init?: RequestInit): Promise<Response> {
  ready ??= import('./handlers')
  await ready
  return transportFetch(path, init)
}
