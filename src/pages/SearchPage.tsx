import { useParams } from 'react-router'

/** Placeholder — implemented on feat/search (REQ-001). */
export default function SearchPage() {
  const { keyword = '' } = useParams()
  return (
    <div className="container">
      <h1>「{keyword}」的搜尋結果</h1>
    </div>
  )
}
