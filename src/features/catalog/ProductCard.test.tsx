import { screen } from '@testing-library/react'
import { renderRoute } from '@/test/render'
import { ProductCard } from './ProductCard'
import type { ProductSummary } from './types'

const product: ProductSummary = {
  id: 'P1',
  brand: 'Apple',
  name: 'iPhone 17 Pro 256G',
  image: { src: 'data:,', alt: 'Apple iPhone 17 Pro 256G', width: 400, height: 400 },
  price: 36900,
  listPrice: 41900,
  tags: ['免運'],
  salesCount: 12345,
  createdAt: '2026-09-01',
}

describe('ProductCard', () => {
  it('REQ-001#AC7 shows price with separators, list price and discount (BR-001#R2)', () => {
    renderRoute('/', [{ path: '/', element: <ProductCard product={product} /> }])
    const link = screen.getByRole('link', { name: /iPhone 17 Pro 256G/ })
    expect(link).toHaveAttribute('href', '/goods/P1')
    expect(screen.getByText('$36,900')).toBeInTheDocument()
    expect(screen.getByText('$41,900')).toBeInTheDocument()
    expect(screen.getByText('88折')).toBeInTheDocument()
  })

  it('BR-001#R2 hides list price and discount when there is no markdown', () => {
    renderRoute('/', [
      { path: '/', element: <ProductCard product={{ ...product, listPrice: undefined }} /> },
    ])
    expect(screen.queryByText(/折$/)).not.toBeInTheDocument()
    expect(screen.queryByText('$41,900')).not.toBeInTheDocument()
  })
})
