#!/usr/bin/env node
/**
 * Human approval gate (ADR-004). Run by the document owner, never by an agent.
 *   npm run approve -- BR-001 ADR-002          # approve specific docs
 *   npm run approve -- --all-drafts            # approve every draft authoritative doc
 * Sets `status: approved` and `approved_by: {who: <owner role>, date: <today>}`.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const args = process.argv.slice(2)
const all = args.includes('--all-drafts')
const ids = new Set(args.filter((a) => !a.startsWith('--')))
const today = new Date().toISOString().slice(0, 10)
const AUTHORITATIVE = /^(REQ|BR|ADR|ARCH|API|OPS|PROD|CR)-/

function walk(dir, out = []) {
  for (const n of readdirSync(dir)) {
    if (n.startsWith('_') || n.startsWith('.')) continue
    const p = join(dir, n)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (n.endsWith('.md')) out.push(p)
  }
  return out
}

let count = 0
for (const file of walk('docs')) {
  let src = readFileSync(file, 'utf8')
  const id = src.match(/^id:\s*(\S+)/m)?.[1]
  const status = src.match(/^status:\s*(\S+)/m)?.[1]
  const owner = src.match(/^owner:\s*(\S+)/m)?.[1]
  if (!id || !AUTHORITATIVE.test(id)) continue
  if (!(ids.has(id) || (all && (status === 'draft' || status === 'review')))) continue
  src = src.replace(/^status:\s*\S+.*$/m, 'status: approved')
  if (/^approved_by:/m.test(src)) {
    src = src.replace(
      /^approved_by:\n(  who:.*\n)?(  date:.*\n)?/m,
      `approved_by:\n  who: ${owner}\n  date: ${today}\n`,
    )
  } else {
    src = src.replace(
      /^source_of_truth:/m,
      `approved_by:\n  who: ${owner}\n  date: ${today}\nsource_of_truth:`,
    )
  }
  writeFileSync(file, src)
  console.log(`approved  ${id}  (who: ${owner}, date: ${today})`)
  ids.delete(id)
  count++
}
for (const id of ids) console.error(`not found or not authoritative: ${id}`)
console.log(`${count} document(s) approved`)
