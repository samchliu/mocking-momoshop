import { useId, useRef, useState } from 'react'
import { clampQuantity, type ProductDetail } from '@/features/catalog'
import { PriceBlock } from './PriceBlock'
import { quantityFromInput, resolveSelection } from './selection'
import styles from './Goods.module.css'

/** Same shape as the cart's add input; the page wires it to `useAddToCart` (features don't import each other). */
export interface AddRequest {
  productId: string
  variantId: string | null
  quantity: number
}

interface Props {
  product: ProductDetail
  onAdd: (input: AddRequest) => void
  /** BR-003#R4: true while the add request is in flight. */
  isAdding: boolean
}

export function PurchasePanel({ product, onAdd, isAdding }: Props) {
  const [variantId, setVariantId] = useState<string | null>(null)
  const [wanted, setWanted] = useState(1)
  const [draft, setDraft] = useState<string | null>(null)
  const [attempted, setAttempted] = useState(false)
  const variantsRef = useRef<HTMLFieldSetElement>(null)
  const ids = useId()

  // Derived at render (no effects): price, stock and limits follow the chosen variant.
  const sel = resolveSelection(product, variantId)
  const limits = { stock: sel.stock, limit: sel.limit }
  // knowledge: BR-003#R2 — the displayed quantity is always re-clamped to the current selection
  const quantity = clampQuantity(wanted, limits)
  const showVariantError = attempted && sel.needsVariant
  const errorId = `${ids}-variant-error`

  const commitDraft = () => {
    if (draft === null) return quantity
    const q = quantityFromInput(draft, limits)
    setWanted(q)
    setDraft(null)
    return q
  }

  const handleAdd = () => {
    const q = commitDraft()
    // knowledge: REQ-002#AC2, BR-003#R1 — no request without a variant
    if (sel.needsVariant) {
      setAttempted(true)
      variantsRef.current?.querySelector('input')?.focus()
      return
    }
    if (sel.soldOut || q < 1) return // BR-003#R3
    onAdd({ productId: product.id, variantId: sel.variant?.id ?? null, quantity: q })
  }

  return (
    <div className={styles.purchase}>
      <PriceBlock price={sel.price} />

      {product.variants.length > 0 && (
        <fieldset
          ref={variantsRef}
          className={styles.variants}
          aria-describedby={showVariantError ? errorId : undefined}
        >
          <legend className={styles.fieldLabel}>規格</legend>
          <div className={styles.variantList}>
            {product.variants.map((v) => {
              const out = v.stock <= 0
              return (
                <label key={v.id} className={styles.variant} data-sold-out={out || undefined}>
                  <input
                    type="radio"
                    name={`${ids}-variant`}
                    value={v.id}
                    checked={variantId === v.id}
                    onChange={() => setVariantId(v.id)}
                    className="visually-hidden"
                  />
                  {v.label}
                  {/* knowledge: REQ-002#AC5 — sold-out variants stay selectable (to see their price) but are marked */}
                  {out && <span className={styles.soldOutTag}>（已售完）</span>}
                </label>
              )
            })}
          </div>
          {showVariantError && (
            <p id={errorId} role="alert" className={styles.error}>
              請選擇規格
            </p>
          )}
        </fieldset>
      )}

      <div className={styles.quantityRow}>
        <label htmlFor={`${ids}-qty`} className={styles.fieldLabel}>
          數量
        </label>
        {/* knowledge: REQ-002#AC3, BR-003#R2 */}
        <div className={styles.stepper}>
          <button
            type="button"
            className={styles.stepButton}
            aria-label="減少數量"
            disabled={sel.soldOut || quantity <= 1}
            onClick={() => {
              setDraft(null)
              setWanted(clampQuantity(quantity - 1, limits))
            }}
          >
            −
          </button>
          <input
            id={`${ids}-qty`}
            type="number"
            inputMode="numeric"
            min={1}
            max={Math.max(1, sel.maxQuantity)}
            step={1}
            className={styles.qtyInput}
            disabled={sel.soldOut}
            value={draft ?? String(Math.max(1, quantity))}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitDraft}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitDraft()
            }}
          />
          <button
            type="button"
            className={styles.stepButton}
            aria-label="增加數量"
            disabled={sel.soldOut || quantity >= sel.maxQuantity}
            onClick={() => {
              setDraft(null)
              setWanted(clampQuantity(quantity + 1, limits))
            }}
          >
            +
          </button>
        </div>
        <span className={styles.limit}>每人限購 {product.purchaseLimit} 件</span>
      </div>

      <div className={styles.actions}>
        {/* knowledge: REQ-002#AC4 BR-003#R4 (disabled while pending), REQ-002#AC5 BR-003#R3 (sold out) */}
        <button
          type="button"
          className={styles.addButton}
          disabled={isAdding || sel.soldOut}
          aria-busy={isAdding || undefined}
          onClick={handleAdd}
        >
          {sel.soldOut ? '已售完' : '放入購物車'}
        </button>
      </div>
    </div>
  )
}
