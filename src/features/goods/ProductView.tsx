import { Link } from 'react-router'
import { ApiError } from '@/api'
import { StatusView } from '@/components'
import type { ProductDetail } from '@/features/catalog'
import { Gallery } from './Gallery'
import { PurchasePanel, type AddRequest } from './PurchasePanel'
import { useProduct } from './useProduct'
import styles from './Goods.module.css'

interface Props {
  id: string
  onAdd: (input: AddRequest) => void
  isAdding: boolean
}

/** Product page body (REQ-002): loading / not found / error+retry / detail. */
export function ProductView({ id, onAdd, isAdding }: Props) {
  const q = useProduct(id)

  // knowledge: REQ-002#AC6 — unknown product gets its own page, not a generic error
  if (q.error instanceof ApiError && q.error.status === 404) return <ProductNotFound />

  return (
    <StatusView
      isPending={q.isPending}
      error={q.error}
      onRetry={() => void q.refetch()}
      isRetrying={q.isFetching}
      pendingView={<Skeleton />}
    >
      {q.data && (
        <ProductDetailView key={q.data.id} product={q.data} onAdd={onAdd} isAdding={isAdding} />
      )}
    </StatusView>
  )
}

function ProductDetailView({
  product,
  onAdd,
  isAdding,
}: { product: ProductDetail } & Omit<Props, 'id'>) {
  return (
    <article className={styles.page}>
      <nav aria-label="麵包屑" className={styles.breadcrumb}>
        <ol>
          <li>
            <Link to="/">Home</Link>
          </li>
          {product.category.map((c) => (
            <li key={c.id}>{c.label}</li>
          ))}
          <li aria-current="page">{product.name}</li>
        </ol>
      </nav>
      <div className={styles.layout}>
        <Gallery images={product.images.length > 0 ? product.images : [product.image]} />
        <div className={styles.info}>
          <p className={styles.brand} data-brand>
            {product.brand}
          </p>
          <h1 className={styles.name}>{product.name}</h1>
          {product.promoText && <p className={styles.promo}>{product.promoText}</p>}
          <PurchasePanel product={product} onAdd={onAdd} isAdding={isAdding} />
          {product.highlights.length > 0 && (
            <ul className={styles.highlights}>
              {product.highlights.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </article>
  )
}

function ProductNotFound() {
  return (
    <div className={styles.notFound}>
      <h1>找不到商品</h1>
      <p>商品可能已下架或網址有誤。</p>
      <Link to="/" className={styles.homeLink}>
        回到首頁
      </Link>
    </div>
  )
}

/** Same footprint as the loaded layout to avoid layout shift. */
function Skeleton() {
  return (
    <div className={styles.layout} aria-busy="true">
      <span className="visually-hidden">商品載入中…</span>
      <div className={`${styles.skeleton} ${styles.skeletonImage}`} />
      <div className={styles.info}>
        <div className={`${styles.skeleton} ${styles.skeletonLine}`} />
        <div className={`${styles.skeleton} ${styles.skeletonLine}`} />
      </div>
    </div>
  )
}
