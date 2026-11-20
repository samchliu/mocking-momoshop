/**
 * Minimal runtime guards for parsing untrusted JSON (API responses, localStorage)
 * without a schema library. Each throws a descriptive error on mismatch.
 */
export type Obj = Record<string, unknown>

export function obj(d: unknown, path = 'value'): Obj {
  if (typeof d !== 'object' || d === null || Array.isArray(d))
    throw new Error(`${path}: expected object`)
  return d as Obj
}
export function str(d: unknown, path: string): string {
  if (typeof d !== 'string') throw new Error(`${path}: expected string`)
  return d
}
export function int(d: unknown, path: string, min = Number.MIN_SAFE_INTEGER): number {
  if (typeof d !== 'number' || !Number.isSafeInteger(d) || d < min)
    throw new Error(`${path}: expected integer >= ${min}`)
  return d
}
export function num(d: unknown, path: string): number {
  if (typeof d !== 'number' || !Number.isFinite(d)) throw new Error(`${path}: expected number`)
  return d
}
export function bool(d: unknown, path: string): boolean {
  if (typeof d !== 'boolean') throw new Error(`${path}: expected boolean`)
  return d
}
export function arr<T>(d: unknown, path: string, item: (v: unknown, p: string) => T): T[] {
  if (!Array.isArray(d)) throw new Error(`${path}: expected array`)
  return d.map((v, i) => item(v, `${path}[${i}]`))
}
export function opt<T>(
  d: unknown,
  path: string,
  parse: (v: unknown, p: string) => T,
): T | undefined {
  return d === undefined || d === null ? undefined : parse(d, path)
}
export function nullable<T>(
  d: unknown,
  path: string,
  parse: (v: unknown, p: string) => T,
): T | null {
  return d === null ? null : parse(d, path)
}
