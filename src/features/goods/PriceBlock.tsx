// knowledge: BR-001#R4 — the product page uses only 「售價」 and 「原價」
import { priceView } from '@/features/catalog'
import type { Selection } from './selection'
import styles from './Goods.module.css'

export function PriceBlock({ price }: { price: Selection['price'] }) {
  const v = priceView(price)
  return (
    <section aria-label="價格" className={styles.priceBlock}>
      <p className={styles.priceRow}>
        <span className={styles.priceLabel}>售價</span>
        <span className={styles.price}>{v.price}</span>
        {v.from && <span className={styles.from}>起</span>}
        {v.discount && <span className={styles.discount}>{v.discount}</span>}
      </p>
      {v.listPrice && (
        <p className={styles.listRow}>
          <span className={styles.priceLabel}>原價</span>
          <s>{v.listPrice}</s>
        </p>
      )}
    </section>
  )
}
