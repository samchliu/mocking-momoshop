// knowledge: REQ-006, BR-004
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { toUserMessage } from '@/api'
import { Button, Dialog, SmartImage, TextInput, useToast } from '@/components'
import { formatPrice } from '@/lib/format'
import { useCart } from './context'
import {
  isSelected,
  parseQuantityInput,
  resolveLine,
  selectAllNext,
  summarize,
  type LineView,
} from './lines'
import { useCartProducts } from './useCartProducts'
import styles from './CartView.module.css'

const STATUS_TEXT: Partial<Record<LineView['status'], string>> = {
  loading: '載入中',
  notFound: '商品已下架',
  variantMissing: '此選項已不存在',
  notForSale: '暫不開放購買',
  soldOut: '已售完',
}

export function CartView() {
  const { state, dispatch } = useCart()
  const toast = useToast()
  const { results, retry } = useCartProducts(state.lines)
  // BR-004#R5: in-memory set of unchecked lines; every visit starts fully checked
  const [deselected, setDeselected] = useState<ReadonlySet<string>>(new Set())
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [focusHeading, setFocusHeading] = useState(0)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const removeRefs = useRef(new Map<string, HTMLButtonElement>())

  // Runs after the Dialog child has closed (child effects first), so focus lands on the heading.
  useEffect(() => {
    if (focusHeading) headingRef.current?.focus()
  }, [focusHeading])

  const views = state.lines.map((l) =>
    resolveLine(l, results.get(l.productId) ?? { status: 'pending' }),
  )
  const summary = summarize(views, deselected)

  function remove(view: LineView) {
    const i = views.indexOf(view)
    const next = views[i + 1] ?? views[i - 1]
    dispatch({ type: 'remove', productId: view.line.productId, variantId: view.line.variantId })
    setDeselected((s) => withoutKey(s, view.key))
    toast.show(`已移除 ${view.name}`, 'success')
    // REQ-006#AC4: the target is already in the DOM (heading is rendered in both states)
    const target = next ? removeRefs.current.get(next.key) : headingRef.current
    target?.focus()
  }

  function toggle(view: LineView) {
    setDeselected((s) => (s.has(view.key) ? withoutKey(s, view.key) : new Set(s).add(view.key)))
  }

  function clearAll() {
    dispatch({ type: 'clear' })
    setDeselected(new Set())
    setConfirmOpen(false)
    toast.show('已清空購物車', 'success')
    setFocusHeading((n) => n + 1)
  }

  return (
    <div className={`container ${styles.page}`}>
      <h1 ref={headingRef} tabIndex={-1} className={styles.title}>
        購物車
      </h1>

      {views.length === 0 ? (
        <div className={styles.empty}>
          <p>購物車是空的</p>
          <Link to="/">去逛逛</Link>
        </div>
      ) : (
        <>
          <div className={styles.toolbar}>
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={summary.selectAll === 'checked'}
                disabled={summary.selectAll === 'disabled'}
                ref={(el) => {
                  if (el) el.indeterminate = summary.selectAll === 'mixed'
                }}
                onChange={() => setDeselected(selectAllNext(views, deselected))}
              />
              全選
            </label>
            <Button variant="text" onClick={() => setConfirmOpen(true)}>
              全部刪除
            </Button>
          </div>

          <ul aria-label="購物車品項" className={styles.list}>
            {views.map((v) => (
              <CartLineItem
                key={v.key}
                view={v}
                selected={isSelected(v, deselected)}
                onToggle={() => toggle(v)}
                onRemove={() => remove(v)}
                onRetry={() => retry(v.line.productId)}
                onQuantity={(quantity) =>
                  dispatch({
                    type: 'setQuantity',
                    productId: v.line.productId,
                    variantId: v.line.variantId,
                    quantity,
                  })
                }
                removeRef={(el) => {
                  if (el) removeRefs.current.set(v.key, el)
                  else removeRefs.current.delete(v.key)
                }}
              />
            ))}
          </ul>

          <div className={styles.bar}>
            <span>
              結帳總金額{' '}
              <strong data-total className={styles.total}>
                {summary.total === null ? '計算中' : formatPrice(summary.total)}
              </strong>
            </span>
            <Button
              tone="cart"
              disabled={summary.checkoutDisabled}
              onClick={() => toast.show('結帳功能尚未開放', 'info')}
            >
              {`結帳(${summary.checkoutCount})`}
            </Button>
          </div>
        </>
      )}

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} title="全部刪除">
        <p>確定要刪除購物車中的所有商品嗎？</p>
        <div className={styles.dialogActions}>
          <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
            取消
          </Button>
          <Button onClick={clearAll}>刪除</Button>
        </div>
      </Dialog>
    </div>
  )
}

function withoutKey(s: ReadonlySet<string>, key: string): ReadonlySet<string> {
  const next = new Set(s)
  next.delete(key)
  return next
}

interface ItemProps {
  view: LineView
  selected: boolean
  onToggle: () => void
  onRemove: () => void
  onRetry: () => void
  onQuantity: (quantity: number) => void
  removeRef: (el: HTMLButtonElement | null) => void
}

function CartLineItem({
  view: v,
  selected,
  onToggle,
  onRemove,
  onRetry,
  onQuantity,
  removeRef,
}: ItemProps) {
  const purchasable = v.status === 'purchasable'
  const hasProduct = v.product !== undefined
  const statusText = v.status === 'error' ? toUserMessage(v.error) : STATUS_TEXT[v.status]

  return (
    <li className={styles.item}>
      <div className={styles.select}>
        {purchasable && (
          <input
            type="checkbox"
            className={styles.checkbox}
            aria-label={`選取 ${v.name}`}
            checked={selected}
            onChange={onToggle}
          />
        )}
      </div>

      <div className={styles.thumb}>
        {v.product && (
          <SmartImage src={v.product.image.src} alt={v.product.image.alt} width={80} height={80} />
        )}
      </div>

      <div className={styles.info}>
        {hasProduct && v.product ? (
          <Link to={`/goods/${encodeURIComponent(v.product.id)}`} className={styles.name}>
            {v.name}
          </Link>
        ) : (
          <span className={styles.name}>{v.name}</span>
        )}
        {v.unitPrice !== undefined && (
          <span className={styles.unit}>單價 {formatPrice(v.unitPrice)}</span>
        )}
        {statusText &&
          (v.status === 'loading' ? (
            <output className={styles.status}>{statusText}</output>
          ) : (
            <span className={styles.status}>{statusText}</span>
          ))}
        {v.overLimit && v.limit !== undefined && (
          <span className={styles.warn}>{`已超過可購買數量，以 ${v.limit} 件計算`}</span>
        )}
      </div>

      <div className={styles.qty}>
        {purchasable && v.limit !== undefined && v.effectiveQuantity !== undefined && (
          <QuantityControl
            name={v.name}
            value={v.effectiveQuantity}
            limit={v.limit}
            onCommit={onQuantity}
          />
        )}
      </div>

      <div className={styles.subtotal}>
        {v.subtotal !== undefined && (
          <>
            <span className={styles.subtotalLabel}>小計</span> {formatPrice(v.subtotal)}
          </>
        )}
      </div>

      <div className={styles.actions}>
        {v.status === 'error' && (
          <Button variant="text" aria-label={`重試 ${v.name}`} onClick={onRetry}>
            重試
          </Button>
        )}
        <Button variant="text" ref={removeRef} aria-label={`移除 ${v.name}`} onClick={onRemove}>
          移除
        </Button>
      </div>
    </li>
  )
}

/** BR-004#R2: ± write immediately from the effective quantity; the input writes on blur / Enter. */
function QuantityControl({
  name,
  value,
  limit,
  onCommit,
}: {
  name: string
  value: number
  limit: number
  onCommit: (quantity: number) => void
}) {
  const [draft, setDraft] = useState<string | null>(null)

  function commit() {
    if (draft === null) return
    setDraft(null)
    onCommit(parseQuantityInput(draft, limit))
  }

  return (
    <div className={styles.stepper}>
      <button
        type="button"
        className={styles.step}
        aria-label={`減少 ${name} 數量`}
        disabled={value <= 1}
        onClick={() => onCommit(parseQuantityInput(String(value - 1), limit))}
      >
        −
      </button>
      <TextInput
        appearance="bare"
        className={styles.qtyInput}
        inputMode="numeric"
        aria-label={`${name} 數量`}
        value={draft ?? String(value)}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
        }}
      />
      <button
        type="button"
        className={styles.step}
        aria-label={`增加 ${name} 數量`}
        disabled={value >= limit}
        onClick={() => onCommit(parseQuantityInput(String(value + 1), limit))}
      >
        ＋
      </button>
    </div>
  )
}
