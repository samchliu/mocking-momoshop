import { LazySection } from '@/components'
import { ProductCard, type HomeResponse } from '@/features/catalog'
import styles from './HomeSections.module.css'

/** Reserved height of one strip row before it renders (keeps the scrollbar/layout stable). */
const STRIP_MIN_HEIGHT = 320

/**
 * knowledge: REQ-003#AC3 — product strips (大家都在買 / 新品上市) are below the fold:
 * their cards are not rendered until the section nears the viewport (LazySection + reserved height).
 */
export function HomeSections({ sections }: { sections: HomeResponse['sections'] }) {
  return (
    <>
      {sections.map((s) => (
        <section key={s.id} className={styles.section} aria-labelledby={`home-section-${s.id}`}>
          <h2 id={`home-section-${s.id}`} className={styles.title}>
            {s.title}
          </h2>
          <LazySection minHeight={STRIP_MIN_HEIGHT}>
            <ul className={styles.strip}>
              {s.items.map((p) => (
                <li key={p.id} className={styles.item}>
                  <ProductCard product={p} headingLevel={3} />
                </li>
              ))}
            </ul>
          </LazySection>
        </section>
      ))}
    </>
  )
}
