import { Link } from 'react-router'

export default function NotFoundPage() {
  return (
    <div className="container" style={{ paddingBlock: 'var(--space-8)' }}>
      <h1>找不到這個頁面</h1>
      <p>
        網址可能有誤或頁面已移除。<Link to="/">回到首頁</Link>
      </p>
    </div>
  )
}
