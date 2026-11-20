import { fastMock, renderRoute } from '@/test/render'

beforeEach(fastMock)

describe('routes', () => {
  it('REQ-002#AC7 redirects the legacy goods URL to /goods/:id', async () => {
    const { router } = renderRoute('/goods/GoodsDetail.jsp?i_code=P10002')
    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/goods/P10002'))
  })

  it('redirects the legacy search URL to /search/:keyword', async () => {
    const { router } = renderRoute('/search/searchShop.jsp?keyword=iphone')
    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/search/iphone'))
  })

  it('legacy goods URL without an id falls back to the not-found page', async () => {
    const { router, findByRole } = renderRoute('/goods/GoodsDetail.jsp')
    expect(await findByRole('heading', { name: '找不到這個頁面' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/goods/GoodsDetail.jsp')
  })
})
