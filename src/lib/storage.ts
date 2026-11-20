import type { Parser } from '@/api'

export type StorageArea = 'local' | 'session'

const area = (a: StorageArea) => (a === 'session' ? window.sessionStorage : window.localStorage)

/**
 * Web Storage is user-controlled input: always validate what you read back.
 * Corrupt / tampered / outdated data falls back instead of crashing the app.
 */
export function readStorage<T>(
  key: string,
  parse: Parser<T>,
  fallback: T,
  where: StorageArea = 'local',
): T {
  try {
    const raw = area(where).getItem(key)
    return raw === null ? fallback : parse(JSON.parse(raw))
  } catch {
    return fallback
  }
}

export function writeStorage(key: string, value: unknown, where: StorageArea = 'local'): void {
  try {
    area(where).setItem(key, JSON.stringify(value))
  } catch {
    // Quota exceeded / private mode: persistence is best-effort, never fatal.
  }
}

export function removeStorage(key: string, where: StorageArea = 'local'): void {
  try {
    area(where).removeItem(key)
  } catch {
    // Storage unavailable: nothing to remove.
  }
}
