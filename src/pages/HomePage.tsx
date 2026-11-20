import { ErrorBoundary } from '@/components'
import { HomeView } from '@/features/home'

export default function HomePage() {
  return (
    <ErrorBoundary name="home">
      <div className="container">
        <h1 className="visually-hidden">momo 購物首頁</h1>
        <HomeView />
      </div>
    </ErrorBoundary>
  )
}
