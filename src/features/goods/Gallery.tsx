import { useState } from 'react'
import { SmartImage } from '@/components'
import type { ImageAsset } from '@/features/catalog'
import styles from './Goods.module.css'

/** Main image (LCP → priority) plus thumbnail buttons. */
export function Gallery({ images }: { images: ImageAsset[] }) {
  const [index, setIndex] = useState(0)
  const main = images[index] ?? images[0]
  if (!main) return null
  return (
    <div className={styles.gallery}>
      <SmartImage
        className={styles.mainImage}
        src={main.src}
        alt={main.alt}
        width={main.width}
        height={main.height}
        priority
      />
      {images.length > 1 && (
        <ul className={styles.thumbs}>
          {images.map((img, i) => (
            <li key={img.src}>
              <button
                type="button"
                className={styles.thumb}
                aria-label={`第 ${i + 1} 張圖片`}
                aria-pressed={i === index}
                onClick={() => setIndex(i)}
              >
                <SmartImage src={img.src} alt="" width={img.width} height={img.height} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
