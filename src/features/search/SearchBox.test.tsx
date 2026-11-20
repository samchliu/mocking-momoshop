import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderRoute } from '@/test/render'
import { SearchBox } from './SearchBox'

const routes = [
  { path: '/', element: <SearchBox /> },
  { path: '/search/:keyword', element: <SearchBox /> },
]

describe('SearchBox', () => {
  it('REQ-001#AC1 submitting " iphone " navigates to /search/iphone', async () => {
    const { router } = renderRoute('/', routes)
    await userEvent.type(screen.getByRole('searchbox', { name: '搜尋商品' }), ' iphone {Enter}')
    expect(router.state.location.pathname).toBe('/search/iphone')
  })

  it('BR-002#R1 normalises full-width input and ignores an empty keyword', async () => {
    const { router } = renderRoute('/', routes)
    const box = screen.getByRole('searchbox', { name: '搜尋商品' })
    await userEvent.type(box, '   {Enter}')
    expect(router.state.location.pathname).toBe('/')
    await userEvent.type(box, 'ＡＩＲ　ＰＯＤＳ{Enter}')
    expect(router.state.location.pathname).toBe('/search/AIR%20PODS')
  })

  it('shows the current keyword when already on a search page', () => {
    renderRoute('/search/dyson', routes)
    expect(screen.getByRole('searchbox', { name: '搜尋商品' })).toHaveValue('dyson')
  })
})
