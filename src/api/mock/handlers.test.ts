import {
  parseCartAddResponse,
  parseHomeFeedResponse,
  parseHomeResponse,
  parseProductDetail,
  parseSearchResponse,
} from '@/features/catalog/parse'
import { mockFetch } from './index'
import { DEMO } from './data'

const get = async (path: string) => {
  const res = await mockFetch(path)
  return { status: res.status, body: (await res.json()) as unknown }
}
const post = async (body: unknown) => {
  const res = await mockFetch('/api/cart/items', { method: 'POST', body: JSON.stringify(body) })
  return { status: res.status, body: (await res.json()) as unknown }
}

beforeAll(() => window.history.replaceState(null, '', '/?latency=0'))
afterAll(() => window.history.replaceState(null, '', '/'))

describe('API-001 mock backend contract', () => {
  it('BR-002#R5 search responses satisfy the parser and clamp the page', async () => {
    const { status, body } = await get('/api/search?q=iphone&page=999')
    expect(status).toBe(200)
    const r = parseSearchResponse(body)
    expect(r.total).toBeGreaterThan(20) // demo keyword spans multiple pages
    expect(r.page).toBe(r.totalPages)
  })

  it('BR-002#R4 repeated brand params and swapped price range are honoured', async () => {
    const r = parseSearchResponse(
      (await get('/api/search?q=&brand=Apple&brand=Samsung&min=30000&max=1000')).body,
    )
    expect(r.items.length).toBeGreaterThan(0)
    for (const i of r.items) {
      expect(['Apple', 'Samsung']).toContain(i.brand)
      expect(i.price).toBeGreaterThanOrEqual(1000)
      expect(i.price).toBeLessThanOrEqual(30000)
    }
  })

  it('rejects malformed search params with 400', async () => {
    expect((await get('/api/search?q=x&sort=cheapest')).status).toBe(400)
    expect((await get('/api/search?q=x&min=abc')).status).toBe(400)
  })

  it('returns parser-valid product detail, 404 for unknown ids', async () => {
    const ok = await get(`/api/products/${DEMO.variantProduct}`)
    expect(ok.status).toBe(200)
    expect(parseProductDetail(ok.body).variants.length).toBeGreaterThan(1)
    expect((await get('/api/products/does-not-exist')).status).toBe(404)
  })

  it('BR-003#R7 returns 409 when quantity exceeds stock or purchase limit', async () => {
    const detail = parseProductDetail((await get(`/api/products/${DEMO.simpleProduct}`)).body)
    const max = Math.min(detail.stock, detail.purchaseLimit)
    const ok = await post({ productId: detail.id, variantId: null, quantity: 1, inCart: 0 })
    expect(ok.status).toBe(200)
    expect(parseCartAddResponse(ok.body).quantity).toBe(1)
    expect(
      (await post({ productId: detail.id, variantId: null, quantity: 1, inCart: max })).status,
    ).toBe(409)
    expect(
      (await post({ productId: DEMO.soldOutProduct, variantId: null, quantity: 1, inCart: 0 }))
        .status,
    ).toBe(409)
  })

  it('BR-003#R1 rejects a missing variant for multi-variant products', async () => {
    expect(
      (await post({ productId: DEMO.variantProduct, variantId: null, quantity: 1, inCart: 0 }))
        .status,
    ).toBe(400)
  })

  it('home payload satisfies the parser', async () => {
    const h = parseHomeResponse((await get('/api/home')).body)
    expect(h.banners.length).toBeGreaterThan(0)
    expect(h.flashSale.items.length).toBeGreaterThan(0)
    expect(h.hotKeywords).toContain('iphone')
  })

  describe('GET /api/home/feed (CR-002)', () => {
    it('CR-002 F3 五批共 100 個、每批 20 個，parser 通過且跨批次 id 不重複', async () => {
      const ids: string[] = []
      for (let page = 1; page <= 5; page++) {
        const { status, body } = await get(`/api/home/feed?page=${page}`)
        expect(status).toBe(200)
        const r = parseHomeFeedResponse(body)
        expect(r).toMatchObject({ page, pageSize: 20, totalPages: 5, total: 100 })
        expect(r.items).toHaveLength(20)
        ids.push(...r.items.map((i) => i.id))
      }
      expect(new Set(ids).size).toBe(100)
    })

    it('CR-002 F3 同一 page 重複請求回傳相同內容', async () => {
      const a = (await get('/api/home/feed?page=3')).body
      const b = (await get('/api/home/feed?page=3')).body
      expect(b).toEqual(a)
    })

    it('CR-002 F2 page 超過 totalPages 時回 200 與空 items，page 照請求值', async () => {
      const { status, body } = await get('/api/home/feed?page=6')
      expect(status).toBe(200)
      expect(parseHomeFeedResponse(body)).toMatchObject({ items: [], page: 6, totalPages: 5 })
    })

    it.each(['', '?page=', '?page=0', '?page=-1', '?page=1.5', '?page=abc'])(
      'CR-002 F1 page 缺少或非正整數時回 400（%s）',
      async (qs) => {
        expect((await get(`/api/home/feed${qs}`)).status).toBe(400)
      },
    )

    it('CR-002 F4 商品流的商品是 ProductSummary，不含限搶價', async () => {
      const r = parseHomeFeedResponse((await get('/api/home/feed?page=1')).body)
      for (const i of r.items) expect(i).not.toHaveProperty('flashPrice')
    })
  })
})
