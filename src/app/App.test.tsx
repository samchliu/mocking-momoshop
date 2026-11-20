import { screen } from '@testing-library/react'
import { fastMock, renderRoute } from '@/test/render'

beforeEach(fastMock)

describe('App shell', () => {
  it('exposes landmarks, a skip link, header search and cart', async () => {
    renderRoute('/')
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument()
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '跳到主要內容' })).toHaveAttribute('href', '#main')
    expect(screen.getByRole('searchbox', { name: '搜尋商品' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '購物車，0 件商品' })).toBeInTheDocument()
  })

  it('renders a not-found page with a way back', async () => {
    renderRoute('/does-not-exist')
    expect(await screen.findByRole('heading', { name: '找不到這個頁面' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '回到首頁' })).toHaveAttribute('href', '/')
  })
})
