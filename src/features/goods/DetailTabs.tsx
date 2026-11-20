import { useId, useRef, useState, type KeyboardEvent } from 'react'
import type { ProductDetail } from '@/features/catalog'
import styles from './Goods.module.css'

/** REQ-002 參數: fixed return-policy copy. */
export const RETURN_POLICY =
  '商品到貨享 7 天鑑賞期（含例假日）。鑑賞期非試用期，退貨時商品須保持全新狀態且包裝完整（含配件、贈品與原廠包裝）。如需退換貨，請於鑑賞期內聯繫客服。'

const TABS = ['商品特色', '商品規格', '退換貨須知'] as const

/**
 * knowledge: REQ-002#AC10 — WAI-ARIA tabs with automatic activation: roving tabindex, ←/→ wrap,
 * Home/End; all panels stay in the DOM (`hidden` when inactive). The parent remounts this per product
 * (key = product id), which resets the selection to 商品特色.
 */
export function DetailTabs({ product }: { product: ProductDetail }) {
  const [selected, setSelected] = useState(0)
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([])
  const base = useId()

  const select = (i: number) => {
    const next = (i + TABS.length) % TABS.length
    setSelected(next)
    tabsRef.current[next]?.focus()
  }
  const onKeyDown = (e: KeyboardEvent) => {
    const move: Record<string, number> = {
      ArrowRight: selected + 1,
      ArrowLeft: selected - 1,
      Home: 0,
      End: TABS.length - 1,
    }
    const to = move[e.key]
    if (to === undefined) return
    e.preventDefault()
    select(to)
  }

  return (
    <section className={styles.details} aria-label="商品詳情">
      <div role="tablist" className={styles.tabList}>
        {TABS.map((label, i) => (
          <button
            key={label}
            ref={(el) => {
              tabsRef.current[i] = el
            }}
            type="button"
            role="tab"
            id={`${base}-tab-${i}`}
            aria-controls={`${base}-panel-${i}`}
            aria-selected={i === selected}
            tabIndex={i === selected ? 0 : -1}
            className={styles.tab}
            onClick={() => setSelected(i)}
            onKeyDown={onKeyDown}
          >
            {label}
          </button>
        ))}
      </div>
      {TABS.map((label, i) => (
        <div
          key={label}
          role="tabpanel"
          id={`${base}-panel-${i}`}
          aria-labelledby={`${base}-tab-${i}`}
          tabIndex={0}
          hidden={i !== selected}
          className={styles.tabPanel}
        >
          {i === 0 && <Highlights items={product.highlights} />}
          {i === 1 && <SpecTable rows={product.specs} />}
          {i === 2 && <p>{RETURN_POLICY}</p>}
        </div>
      ))}
    </section>
  )
}

function Highlights({ items }: { items: string[] }) {
  if (items.length === 0) return <p>暫無商品特色</p>
  return (
    <ul className={styles.highlights}>
      {items.map((h, i) => (
        // eslint-disable-next-line react/no-array-index-key -- display-only list that never reorders
        <li key={i}>{h}</li>
      ))}
    </ul>
  )
}

/** knowledge: REQ-002#AC11, API-001 specs — row headers, API order, index keys (labels may repeat). */
function SpecTable({ rows }: { rows: ProductDetail['specs'] }) {
  if (rows.length === 0) return <p>暫無規格資料</p>
  return (
    <table className={styles.specTable}>
      <tbody>
        {rows.map((r, i) => (
          // eslint-disable-next-line react/no-array-index-key -- labels may repeat; order is fixed (API-001)
          <tr key={i}>
            <th scope="row">{r.label}</th>
            <td>{r.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
