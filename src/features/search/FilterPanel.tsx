import { useId, useState } from 'react'
import { Button, TextInput } from '@/components'
import type { Facet, SearchCriteria } from '@/features/catalog'
import { hasFilters, type CriteriaChange } from './params'
import styles from './SearchResults.module.css'

interface Props {
  criteria: SearchCriteria
  facets: Facet[] | undefined
  onChange: (change: CriteriaChange) => void
}

const parseAmount = (v: FormDataEntryValue | null) =>
  typeof v === 'string' && /^\d{1,9}$/.test(v.trim()) ? Number(v.trim()) : undefined

/** Open by default on wide screens; collapsed on mobile (no matchMedia, e.g. tests → open). */
const startOpen = () =>
  typeof window.matchMedia !== 'function' || window.matchMedia('(min-width: 768px)').matches

/** Brand facet (with counts) + price range (REQ-001#AC3, BR-002#R4, BR-002#R7). */
export function FilterPanel({ criteria, facets, onChange }: Props) {
  const [open] = useState(startOpen)
  const ids = useId()
  const brandFacet = facets?.find((f) => f.key === 'brand')
  const options = brandFacet?.options ?? []
  // A selected brand that has no hits under the other conditions must stay visible to be unchecked.
  const missing = criteria.brands
    .filter((b) => !options.some((o) => o.value === b))
    .map((b) => ({ value: b, label: b, count: 0 }))
  const active =
    criteria.brands.length + (criteria.min !== undefined || criteria.max !== undefined ? 1 : 0)

  const toggleBrand = (brand: string, checked: boolean) =>
    onChange({
      brands: checked ? [...criteria.brands, brand] : criteria.brands.filter((b) => b !== brand),
    })

  return (
    <aside className={styles.filters} aria-label="篩選條件">
      <details className={styles.details} open={open}>
        <summary className={styles.summary}>篩選{active > 0 && `（${active}）`}</summary>
        <div className={styles.filterBody}>
          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>{brandFacet?.label ?? '品牌'}</legend>
            {[...options, ...missing].map((o) => (
              <label key={o.value} className={styles.check}>
                <input
                  type="checkbox"
                  checked={criteria.brands.includes(o.value)}
                  onChange={(e) => toggleBrand(o.value, e.currentTarget.checked)}
                />
                {o.label} ({o.count})
              </label>
            ))}
          </fieldset>

          <form
            // remount when the URL changes so the inputs always show the applied range
            key={`${criteria.min ?? ''}-${criteria.max ?? ''}`}
            onSubmit={(e) => {
              e.preventDefault()
              const fd = new FormData(e.currentTarget)
              // knowledge: BR-002#R4 — a reversed range is sent as-is; the API swaps it
              onChange({ min: parseAmount(fd.get('min')), max: parseAmount(fd.get('max')) })
            }}
          >
            <fieldset className={styles.fieldset}>
              <legend className={styles.legend}>價格區間</legend>
              <div className={styles.range}>
                <label className={styles.rangeField} htmlFor={`${ids}-min`}>
                  <span className="visually-hidden">最低價</span>
                  <TextInput
                    id={`${ids}-min`}
                    type="number"
                    name="min"
                    inputMode="numeric"
                    min={0}
                    step={1}
                    placeholder="最低價"
                    defaultValue={criteria.min}
                  />
                </label>
                <span aria-hidden="true">～</span>
                <label className={styles.rangeField} htmlFor={`${ids}-max`}>
                  <span className="visually-hidden">最高價</span>
                  <TextInput
                    id={`${ids}-max`}
                    type="number"
                    name="max"
                    inputMode="numeric"
                    min={0}
                    step={1}
                    placeholder="最高價"
                    defaultValue={criteria.max}
                  />
                </label>
                <Button variant="secondary" type="submit">
                  確認
                </Button>
              </div>
            </fieldset>
          </form>

          {hasFilters(criteria) && (
            <Button
              variant="text"
              className={styles.clearAll}
              onClick={() => onChange({ brands: [], min: undefined, max: undefined })}
            >
              全部清除
            </Button>
          )}
        </div>
      </details>
    </aside>
  )
}
