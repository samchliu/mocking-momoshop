import type { Parser } from '@/api'

/**
 * localStorage is user-controlled input: always validate what you read back.
 * Corrupt / tampered / outdated data falls back instead of crashing the app.
 */
export function readStorage<T>(key: string, parse: Parser<T>, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key)
    return raw === null ? fallback : parse(JSON.parse(raw))
  } catch {
    return fallback
  }
}

export function writeStorage(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Quota exceeded / private mode: persistence is best-effort, never fatal.
  }
}
