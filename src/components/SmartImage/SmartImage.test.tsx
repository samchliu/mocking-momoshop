import { fireEvent, render, screen } from '@testing-library/react'
import { SmartImage } from './SmartImage'

describe('SmartImage', () => {
  it('lazy-loads by default and keeps intrinsic size', () => {
    render(<SmartImage src="/a.webp" alt="商品" width={200} height={200} />)
    const img = screen.getByRole('img', { name: '商品' })
    expect(img).toHaveAttribute('loading', 'lazy')
    expect(img).toHaveAttribute('width', '200')
    expect(img).toHaveAttribute('height', '200')
  })
  it('loads eagerly with high priority when priority is set', () => {
    render(<SmartImage src="/hero.webp" alt="主視覺" width={1200} height={400} priority />)
    const img = screen.getByRole('img', { name: '主視覺' })
    expect(img).toHaveAttribute('loading', 'eager')
    expect(img).toHaveAttribute('fetchpriority', 'high')
  })
})

describe('SmartImage fallback', () => {
  it('swaps to a placeholder when the image fails, keeping alt and size', () => {
    render(<SmartImage src="/broken.webp" alt="壞圖" width={100} height={100} />)
    const img = screen.getByRole('img', { name: '壞圖' })
    fireEvent.error(img)
    expect(img.getAttribute('src')).toMatch(/^data:image\/svg\+xml/)
    expect(img).toHaveAttribute('data-failed', 'true')
    expect(img).toHaveAttribute('width', '100')
  })
})
