import { Link } from 'react-router'
import styles from './Page.module.css'

export default function NotFoundPage() {
  return (
    <div className={`container ${styles.simple}`}>
      <h1>找不到這個頁面</h1>
      <p>
        網址可能有誤或頁面已移除。<Link to="/">回到首頁</Link>
      </p>
    </div>
  )
}
