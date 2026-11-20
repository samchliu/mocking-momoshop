import { ErrorBoundary } from '@/components'

export default function HomePage() {
  return (
    <ErrorBoundary name="home">
      <div className="container">
        <h1>首頁</h1>
      </div>
    </ErrorBoundary>
  )
}
