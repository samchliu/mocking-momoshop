import { Link } from 'react-router'
import { SmartImage } from '@/components'
import { formatSalesCount, priceView } from './price'
import type { ProductSummary } from './types'
import styles from './ProductCard.module.css'

interface Props {
  product: ProductSummary
  /** Only the first visible card image is the LCP candidate. */
  priority?: boolean
  /** Heading level inside the surrounding page outline. */
  headingLevel?: 2 | 3
}

/** Product card shared by search results and home sections (BR-001). */
export function ProductCard({ product: p, priority = false, headingLevel = 3 }: Props) {
  const v = priceView(p)
  const Heading = `h${headingLevel}` as const
  return (
    <article className={styles.card}>
      <Link to={`/goods/${encodeURIComponent(p.id)}`} className={styles.link}>
        <SmartImage
          className={styles.image}
          src={p.image.src}
          alt=""
          width={p.image.width}
          height={p.image.height}
          priority={priority}
        />
        <Heading className={styles.name}>
          <span className={styles.brand}>{p.brand}</span> {p.name}
        </Heading>
      </Link>
      {p.promoText && <p className={styles.promo}>{p.promoText}</p>}
      <p className={styles.prices}>
        <span className={styles.price}>
          <span className="visually-hidden">售價</span>
          {v.price}
          {v.from && <span className={styles.from}>起</span>}
        </span>
        {v.listPrice && (
          <s className={styles.list}>
            <span className="visually-hidden">原價</span>
            {v.listPrice}
          </s>
        )}
        {v.discount && <span className={styles.discount}>{v.discount}</span>}
      </p>
      <p className={styles.meta}>
        {p.tags.slice(0, 2).map((t) => (
          <span key={t} className={styles.tag}>
            {t}
          </span>
        ))}
        <span className={styles.sales}>總銷量 {formatSalesCount(p.salesCount)}</span>
      </p>
    </article>
  )
}
