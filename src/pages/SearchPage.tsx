import { useParams } from 'react-router'
import { SearchResults } from '@/features/search'

/** /search/:keyword (REQ-001, ADR-005). The page only assembles the search feature. */
export default function SearchPage() {
  const { keyword = '' } = useParams()
  return <SearchResults keyword={keyword} />
}
