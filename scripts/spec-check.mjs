#!/usr/bin/env node
/**
 * Knowledge ↔ test traceability gate (see docs/operations/OPS-001.md, ADR-004).
 *
 * Reads the living-kb sources and requires every testable item to be referenced by a test title:
 *   - REQ acceptance criteria  → `REQ-001#AC1`   (from the "## 驗收條件" table)
 *   - BR rules                 → `BR-002#R5`     (from the "## 規則" table)
 *
 * Severity (time-boxed delivery, made explicit instead of hidden):
 *   - [P0] acceptance criteria without a test → error (fails verify)
 *   - [P1] criteria and BR rules without a test → warning (reported; `--strict` makes them errors)
 *   - tests referencing IDs that do not exist  → error (drift)
 * Deprecated / archived documents are ignored.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const strict = process.argv.includes('--strict')
// Optional scope: `spec:check -- REQ-001 BR-002` checks only those documents (feature branches).
const scope = new Set(process.argv.slice(2).filter((a) => !a.startsWith('--')))
const inScope = (id) => scope.size === 0 || scope.has(id)

function walk(dir, test, out = []) {
  let entries = []
  try {
    entries = readdirSync(dir)
  } catch {
    return out
  }
  for (const name of entries) {
    if (name.startsWith('.') || name.startsWith('_') || name === 'node_modules') continue
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, test, out)
    else if (test(name)) out.push(p)
  }
  return out
}

function frontMatter(src) {
  const m = src.match(/^---\n([\s\S]*?)\n---/)
  const get = (k) => m?.[1].match(new RegExp(`^${k}:\\s*(.+)$`, 'm'))?.[1].trim()
  return { id: get('id'), status: get('status') }
}

function section(src, heading) {
  const start = src.search(new RegExp(`^## ${heading}`, 'm'))
  if (start < 0) return ''
  const rest = src.slice(start + 3)
  const end = rest.search(/^## /m)
  return end < 0 ? rest : rest.slice(0, end)
}

const items = []
const outOfScope = new Set()
for (const file of walk('docs', (n) => n.endsWith('.md'))) {
  const src = readFileSync(file, 'utf8')
  const { id, status } = frontMatter(src)
  if (!id || status === 'deprecated' || status === 'archived') continue
  if (!inScope(id)) {
    // still register out-of-scope IDs as known, so references to them are not flagged as drift
    if (id.startsWith('REQ-'))
      for (const m of section(src, '驗收條件').matchAll(/^\|\s*(AC\d+)\s*\|/gm))
        outOfScope.add(`${id}#${m[1]}`)
    if (id.startsWith('BR-'))
      for (const m of section(src, '規則').matchAll(/^\|\s*(R\d+)\s*\|/gm))
        outOfScope.add(`${id}#${m[1]}`)
    continue
  }
  if (id.startsWith('REQ-')) {
    for (const m of section(src, '驗收條件').matchAll(
      /^\|\s*(AC\d+)\s*\|\s*(\[P\d\])?\s*([^|]*)\|/gm,
    ))
      items.push({ ref: `${id}#${m[1]}`, prio: m[2]?.slice(1, -1) ?? 'P1', text: m[3].trim() })
  }
  if (id.startsWith('BR-')) {
    for (const m of section(src, '規則').matchAll(/^\|\s*(R\d+)\s*\|\s*([^|]*)\|/gm))
      items.push({ ref: `${id}#${m[1]}`, prio: 'BR', text: m[2].trim() })
  }
}

const tests = walk('src', (n) => /\.test\.[tj]sx?$/.test(n))
  .concat(walk('e2e', (n) => /\.spec\.[tj]sx?$/.test(n)))
  .map((f) => ({ f, src: readFileSync(f, 'utf8') }))

const known = new Set([...items.map((i) => i.ref), ...outOfScope])
const esc = (s) => s.replace(/[#-]/g, (c) => `\\${c}`)
const rows = items.map((i) => {
  const re = new RegExp(`${esc(i.ref)}(?![0-9])`)
  return { ...i, files: tests.filter(({ src }) => re.test(src)).map(({ f }) => f) }
})

const unknown = new Set()
for (const { src } of tests)
  for (const m of src.matchAll(/\b((?:REQ|BR)-\d{3}#(?:AC|R)\d+)/g))
    if (!known.has(m[1])) unknown.add(m[1])

const covered = rows.filter((r) => r.files.length).length
const label = scope.size ? ` (scope: ${[...scope].join(', ')})` : ''
console.log(`Knowledge traceability${label}: ${covered}/${rows.length} items covered by tests`)
for (const r of rows) {
  const mark = r.files.length ? '✔' : r.prio === 'P0' || strict ? '✘' : '·'
  console.log(`  ${mark} ${r.ref.padEnd(12)} [${r.prio}] ${r.text.slice(0, 60)}`)
}

const errors = []
const p0Missing = rows.filter((r) => !r.files.length && (r.prio === 'P0' || strict))
if (p0Missing.length) errors.push(`Missing tests: ${p0Missing.map((r) => r.ref).join(', ')}`)
if (unknown.size) errors.push(`Tests reference unknown or retired IDs: ${[...unknown].join(', ')}`)
const warn = rows.filter((r) => !r.files.length && r.prio !== 'P0' && !strict)
if (warn.length)
  console.log(`\n· ${warn.length} non-P0 item(s) without tests (allowed; listed above)`)
for (const e of errors) console.error(`\n✘ ${e}`)
process.exit(errors.length ? 1 : 0)
