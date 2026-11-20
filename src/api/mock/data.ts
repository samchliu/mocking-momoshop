/**
 * Deterministic mock catalogue (seeded PRNG → identical data on every load, test and screenshot).
 * Images are tiny inline SVGs: no network, CSP-safe (img-src data:), fixed intrinsic size (no CLS).
 */
import type {
  FlashSaleItem,
  HomeResponse,
  ImageAsset,
  ProductDetail,
  ProductSummary,
  Variant,
} from '@/features/catalog/types'

function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rand = mulberry32(20261120)
const pick = <T>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)] as T
const between = (lo: number, hi: number) => Math.floor(lo + rand() * (hi - lo + 1))
const round10 = (n: number) => Math.round(n / 10) * 10

function hue(s: string) {
  let h = 0
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 360
  return h
}
export function svgImage(label: string, width = 400, height = 400, seed = label): ImageAsset {
  const h = hue(seed)
  const text = label.length > 14 ? `${label.slice(0, 13)}…` : label
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="hsl(${h} 45% 92%)"/><circle cx="${width / 2}" cy="${height / 2 - 20}" r="${Math.min(width, height) / 5}" fill="hsl(${h} 55% 62%)"/><text x="50%" y="${height - 48}" font-family="sans-serif" font-size="${Math.round(Math.min(width, height) / 16)}" text-anchor="middle" fill="hsl(${h} 40% 25%)">${text.replace(/[<&>]/g, '')}</text></svg>`
  return { src: `data:image/svg+xml,${encodeURIComponent(svg)}`, alt: label, width, height }
}

const TAGS = ['限時折扣', '免運', '24h到貨', '品牌旗艦', '分期0利率'] as const

interface Seed {
  brand: string
  name: string
  price: [number, number]
  category: string
}
const seeds: Seed[] = []
for (const m of [
  'iPhone 16',
  'iPhone 16 Plus',
  'iPhone 17',
  'iPhone 17 Pro',
  'iPhone 17 Pro Max',
  'iPhone Air',
])
  for (const cap of ['128G', '256G', '512G'])
    seeds.push({ brand: 'Apple', name: `${m} ${cap}`, price: [24900, 52900], category: '手機' })
for (const m of ['Galaxy S26', 'Galaxy S26 Ultra', 'Galaxy A57', 'Galaxy Z Flip7'])
  for (const cap of ['256G', '512G'])
    seeds.push({ brand: 'Samsung', name: `${m} ${cap}`, price: [12900, 46900], category: '手機' })
for (const m of ['Pixel 10', 'Pixel 10 Pro'])
  seeds.push({ brand: 'Google', name: `${m} 256G`, price: [24900, 33900], category: '手機' })
for (const m of ['Xperia 1 VII', 'Xperia 10 VII'])
  seeds.push({ brand: 'SONY', name: m, price: [13900, 42900], category: '手機' })
for (const b of ['Spigen', 'ESR', 'Belkin'])
  for (const m of ['iPhone 17', 'iPhone 17 Pro', 'Galaxy S26'])
    for (const t of ['防摔手機殼', '鋼化保護貼', 'MagSafe 充電器'])
      seeds.push({ brand: b, name: `${t} for ${m}`, price: [390, 1990], category: '手機配件' })
for (const m of ['MacBook Air 13 M4', 'MacBook Pro 14 M5'])
  seeds.push({ brand: 'Apple', name: m, price: [35900, 62900], category: '筆電' })
for (const m of ['Zenbook 14 OLED', 'Vivobook S15'])
  seeds.push({ brand: 'ASUS', name: m, price: [27900, 42900], category: '筆電' })
for (const m of ['V15 Detect 無線吸塵器', 'Supersonic 吹風機', 'Purifier Cool 空氣清淨機'])
  seeds.push({ brand: 'Dyson', name: m, price: [12900, 26900], category: '家電' })
for (const m of ['奈米水離子吹風機', '變頻冰箱 500L', '洗脫烘滾筒洗衣機'])
  seeds.push({ brand: 'Panasonic', name: m, price: [4990, 52900], category: '家電' })

function summaryFrom(id: string, s: Seed): ProductSummary {
  const price = round10(between(s.price[0], s.price[1]))
  const discounted = rand() < 0.55
  return {
    id,
    brand: s.brand,
    name: s.name,
    image: svgImage(`${s.brand} ${s.name}`, 400, 400, s.name),
    price,
    listPrice: discounted ? round10(price / (0.7 + rand() * 0.25)) : undefined,
    promoText: rand() < 0.4 ? pick(['登記送mo幣', '指定卡分期0利率', '買就送好禮']) : undefined,
    tags: TAGS.filter(() => rand() < 0.3),
    salesCount: between(0, 30000),
    rating: Math.round((3.6 + rand() * 1.4) * 10) / 10,
    reviewCount: between(0, 4000),
    createdAt: new Date(Date.UTC(2025, 6, 1) + between(0, 480) * 86_400_000).toISOString(),
  }
}

const details = new Map<string, ProductDetail>()
function register(
  summary: ProductSummary,
  extra: Partial<ProductDetail> & { categoryLabel: string },
) {
  const { categoryLabel, ...rest } = extra
  const detail: ProductDetail = {
    ...summary,
    category: [
      { id: 'c1', label: categoryLabel },
      { id: 'c2', label: summary.brand },
    ],
    images: [
      summary.image,
      svgImage(`${summary.name} 側面`, 400, 400, `${summary.name}-2`),
      svgImage(`${summary.name} 配件`, 400, 400, `${summary.name}-3`),
    ],
    highlights: [`${summary.brand} 原廠公司貨`, '7 天鑑賞期', '台灣保固一年'],
    variants: [],
    stock: between(1, 30),
    purchaseLimit: 5,
    ...rest,
  }
  details.set(detail.id, detail)
}

/** Stable ids used by tests, e2e and README demo links. */
export const DEMO = {
  variantProduct: 'P10001',
  simpleProduct: 'P10002',
  soldOutProduct: 'P10003',
} as const

// --- hand-crafted demo products -------------------------------------------------------------
const variants: Variant[] = [
  { id: 'P10001-256', label: '256GB', price: 39900, listPrice: 41900, stock: 12 },
  { id: 'P10001-512', label: '512GB', price: 46900, listPrice: 48900, stock: 2 },
  { id: 'P10001-1T', label: '1TB', price: 53900, stock: 0 },
]
const demo1: ProductSummary = {
  ...summaryFrom(DEMO.variantProduct, {
    brand: 'Apple',
    name: 'iPhone 17 Pro 原廠公司貨',
    price: [39900, 39900],
    category: '手機',
  }),
  price: 39900,
  listPrice: 41900,
  priceFrom: true, // BR-001#R6
}
register(demo1, { categoryLabel: '手機', variants, stock: 14, purchaseLimit: 2 })

const demo2 = {
  ...summaryFrom(DEMO.simpleProduct, {
    brand: 'Apple',
    name: 'AirPods Pro 3',
    price: [7490, 7490],
    category: '耳機',
  }),
  price: 7490,
  listPrice: 7990,
}
register(demo2, { categoryLabel: '耳機', stock: 3, purchaseLimit: 5 })

const demo3 = {
  ...summaryFrom(DEMO.soldOutProduct, {
    brand: 'Dyson',
    name: 'V15 Detect Absolute 限量版',
    price: [24900, 24900],
    category: '家電',
  }),
  price: 24900,
}
register(demo3, { categoryLabel: '家電', stock: 0 })

// --- generated catalogue --------------------------------------------------------------------
seeds.forEach((s, i) => {
  const summary = summaryFrom(`P${20001 + i}`, s)
  const soldOut = rand() < 0.08
  const colors = s.category === '手機' ? ['黑色', '白色', pick(['藍色', '沙漠色', '粉色'])] : []
  const vs: Variant[] = colors.map((c, j) => ({
    id: `${summary.id}-${j}`,
    label: c,
    price: summary.price,
    listPrice: summary.listPrice,
    stock: soldOut ? 0 : between(0, 15),
  }))
  register(summary, {
    categoryLabel: s.category,
    variants: vs,
    stock: vs.length ? vs.reduce((n, v) => n + v.stock, 0) : soldOut ? 0 : between(1, 40),
    purchaseLimit: rand() < 0.2 ? 2 : 5,
  })
})

const toSummary = ({
  category: _c,
  images: _i,
  highlights: _h,
  variants: _v,
  stock: _s,
  purchaseLimit: _p,
  ...s
}: ProductDetail): ProductSummary => s

export const PRODUCTS: readonly ProductSummary[] = [...details.values()].map(toSummary)
export const getProductDetail = (id: string) => details.get(id)

export function buildHome(now = new Date()): HomeResponse {
  // flash sale window: the current 2-hour slot (BR-001#R5)
  const start = new Date(now)
  start.setMinutes(0, 0, 0)
  start.setHours(start.getHours() - (start.getHours() % 2))
  const end = new Date(start.getTime() + 2 * 3_600_000)
  const bySales = [...PRODUCTS].sort(
    (a, b) => b.salesCount - a.salesCount || (a.id < b.id ? -1 : 1),
  )
  const flash: FlashSaleItem[] = bySales.slice(0, 8).map((p, i) => ({
    ...p,
    flashPrice: round10(p.price * 0.85),
    remaining: [3, 12, 0, 25, 7, 1, 40, 9][i] ?? 5,
  }))
  return {
    banners: [
      { id: 'b1', image: svgImage('iPhone 17 系列 登場', 1200, 400, 'b1'), href: '/search/iphone' },
      { id: 'b2', image: svgImage('Dyson 家電週', 1200, 400, 'b2'), href: '/search/dyson' },
      { id: 'b3', image: svgImage('手機配件 買一送一', 1200, 400, 'b3'), href: '/search/保護貼' },
      { id: 'b4', image: svgImage('筆電開學季', 1200, 400, 'b4'), href: '/search/macbook' },
    ],
    flashSale: { startsAt: start.toISOString(), endsAt: end.toISOString(), items: flash },
    hotKeywords: ['iphone', 'dyson', '保護貼', 'airpods', 'galaxy', 'macbook'],
    sections: [
      { id: 'hot', title: '大家都在買', items: bySales.slice(8, 18) },
      {
        id: 'new',
        title: '新品上市',
        items: [...PRODUCTS]
          .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
          .slice(0, 10),
      },
    ],
  }
}
