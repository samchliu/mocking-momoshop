import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Button, StatusView } from '@/components'
import { ProductCard } from '@/features/catalog'
import { FilterPanel } from './FilterPanel'
import { Pagination } from './Pagination'
import { applyChange, hasFilters, parseCriteria, type CriteriaChange } from './params'
import { ResultsSkeleton } from './ResultsSkeleton'
import { SortBar } from './SortBar'
import { searchKey, useHotKeywords, useSearchResults } from './useSearchResults'
import styles from './SearchResults.module.css'

/** Search results page body (REQ-001). All criteria come from the URL (ADR-005). */
export function SearchResults({ keyword }: { keyword: string }) {
  const [params, setParams] = useSearchParams()
  const criteria = parseCriteria(keyword, params)
  const query = useSearchResults(criteria)
  const queryClient = useQueryClient()
  const { data, isPlaceholderData } = query
  const current = isPlaceholderData ? undefined : data

  const change = (c: CriteriaChange) =>
    // knowledge: BR-002#R6 — applyChange resets the page on every non-page change
    setParams((prev) => applyChange(prev, c), { preventScrollReset: true })

  // knowledge: REQ-001#AC4, BR-002#R5 — the server returns the corrected page; mirror it in the URL
  // (replace, so Back does not return to the illegal URL). Not data fetching: URL sync only.
  const rawPage = params.get('page')
  const serverPage = current?.page
  useEffect(() => {
    if (serverPage === undefined || !current) return
    const canonical = serverPage > 1 ? String(serverPage) : null
    if (rawPage === canonical) return
    // the corrected URL maps to the same result: seed it so no second request is made
    queryClient.setQueryData(searchKey({ ...criteria, page: serverPage }), current)
    setParams((prev) => applyChange(prev, { page: serverPage }), {
      replace: true,
      preventScrollReset: true,
    })
    // criteria/current are derived from rawPage + serverPage; listing them would re-run needlessly
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawPage, serverPage])

  const filtered = hasFilters(criteria)
  const isEmpty = current?.total === 0
  const hot = useHotKeywords(isEmpty && !filtered)

  if (!criteria.q) {
    return (
      <div className="container">
        <h1 className={styles.title}>請輸入搜尋關鍵字</h1>
      </div>
    )
  }

  return (
    <div className={`container ${styles.page}`}>
      <header className={styles.head}>
        <h1 className={styles.title}>「{criteria.q}」的搜尋結果</h1>
        <p className={styles.count} aria-live="polite">
          {current && `共 ${current.total} 件商品`}
        </p>
      </header>

      <div className={styles.layout}>
        <FilterPanel criteria={criteria} facets={data?.facets} onChange={change} />

        <section className={styles.results} aria-label="商品">
          <div className={styles.toolbar}>
            <SortBar value={criteria.sort} onChange={(sort) => change({ sort })} />
            {current && (
              <Pagination page={current.page} totalPages={current.totalPages} label="上方分頁" />
            )}
          </div>

          {/* knowledge: REQ-001#AC6 — skeleton while the current criteria are loading */}
          <StatusView
            isPending={query.isPending || isPlaceholderData}
            error={query.error}
            onRetry={() => void query.refetch()}
            isRetrying={query.isFetching}
            pendingView={<ResultsSkeleton />}
            isEmpty={isEmpty}
            emptyTitle={filtered ? '查無符合條件的商品' : `查無「${criteria.q}」的相關商品`}
            emptyHint={
              // knowledge: REQ-001#AC5
              filtered ? (
                <Button
                  variant="secondary"
                  onClick={() => change({ brands: [], min: undefined, max: undefined })}
                >
                  清除篩選
                </Button>
              ) : hot.data && hot.data.length > 0 ? (
                <nav className={styles.hot} aria-label="熱門關鍵字">
                  <p className={styles.hotTitle}>試試熱門關鍵字：</p>
                  <ul className={styles.hotList}>
                    {hot.data.map((k) => (
                      <li key={k}>
                        <Link className={styles.chip} to={`/search/${encodeURIComponent(k)}`}>
                          {k}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
              ) : (
                <p>請試試其他關鍵字。</p>
              )
            }
          >
            {current && (
              <>
                <ul className={styles.grid} aria-label="搜尋結果">
                  {current.items.map((p, i) => (
                    <li key={p.id}>
                      {/* knowledge: REQ-001#AC7 — only the first card is the LCP candidate */}
                      <ProductCard product={p} priority={i === 0} headingLevel={2} />
                    </li>
                  ))}
                </ul>
                <Pagination page={current.page} totalPages={current.totalPages} label="分頁" />
              </>
            )}
          </StatusView>
        </section>
      </div>
    </div>
  )
}
