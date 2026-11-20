/** Runtime validation of API-001 responses. Anything that does not match is rejected as a parse error. */
import { arr, int, nullable, num, obj, opt, str } from '@/lib/guard'
import type {
  CartAddResponse,
  Facet,
  FlashSaleItem,
  HomeResponse,
  ImageAsset,
  ProductDetail,
  ProductSummary,
  SearchResponse,
  Variant,
} from './types'

const money = (d: unknown, p: string) => int(d, p, 0)
/** String that is non-empty after trimming; returns the trimmed value. */
const filled = (d: unknown, p: string) => {
  const s = str(d, p).trim()
  if (s === '') throw new Error(`${p}: expected non-blank string`)
  return s
}

export function parseImage(d: unknown, p = 'image'): ImageAsset {
  const o = obj(d, p)
  return {
    src: str(o.src, `${p}.src`),
    alt: str(o.alt, `${p}.alt`),
    width: int(o.width, `${p}.width`, 1),
    height: int(o.height, `${p}.height`, 1),
  }
}

export function parseProductSummary(d: unknown, p = 'product'): ProductSummary {
  const o = obj(d, p)
  return {
    id: str(o.id, `${p}.id`),
    brand: str(o.brand, `${p}.brand`),
    name: str(o.name, `${p}.name`),
    image: parseImage(o.image, `${p}.image`),
    price: money(o.price, `${p}.price`),
    listPrice: opt(o.listPrice, `${p}.listPrice`, money),
    priceFrom: o.priceFrom === true ? true : undefined,
    promoText: opt(o.promoText, `${p}.promoText`, str),
    tags: arr(o.tags, `${p}.tags`, str),
    salesCount: int(o.salesCount, `${p}.salesCount`, 0),
    rating: opt(o.rating, `${p}.rating`, num),
    reviewCount: opt(o.reviewCount, `${p}.reviewCount`, (v, q) => int(v, q, 0)),
    createdAt: str(o.createdAt, `${p}.createdAt`),
  }
}

function parseVariant(d: unknown, p: string): Variant {
  const o = obj(d, p)
  return {
    id: str(o.id, `${p}.id`),
    label: str(o.label, `${p}.label`),
    price: money(o.price, `${p}.price`),
    listPrice: opt(o.listPrice, `${p}.listPrice`, money),
    stock: int(o.stock, `${p}.stock`, 0),
  }
}

export function parseProductDetail(d: unknown): ProductDetail {
  const o = obj(d, 'detail')
  return {
    ...parseProductSummary(o, 'detail'),
    category: arr(o.category, 'detail.category', (c, p) => {
      const co = obj(c, p)
      return { id: str(co.id, `${p}.id`), label: str(co.label, `${p}.label`) }
    }),
    images: arr(o.images, 'detail.images', parseImage),
    highlights: arr(o.highlights, 'detail.highlights', str),
    variants: arr(o.variants, 'detail.variants', parseVariant),
    stock: int(o.stock, 'detail.stock', 0),
    purchaseLimit: int(o.purchaseLimit, 'detail.purchaseLimit', 1),
    // knowledge: API-001 specs — required array; each label/value a non-blank string, output trimmed
    specs: arr(o.specs, 'detail.specs', (r, p) => {
      const ro = obj(r, p)
      return { label: filled(ro.label, `${p}.label`), value: filled(ro.value, `${p}.value`) }
    }),
  }
}

function parseFacet(d: unknown, p: string): Facet {
  const o = obj(d, p)
  if (o.key !== 'brand') throw new Error(`${p}.key: unsupported facet`)
  return {
    key: 'brand',
    label: str(o.label, `${p}.label`),
    options: arr(o.options, `${p}.options`, (v, q) => {
      const vo = obj(v, q)
      return {
        value: str(vo.value, `${q}.value`),
        label: str(vo.label, `${q}.label`),
        count: int(vo.count, `${q}.count`, 0),
      }
    }),
  }
}

export function parseSearchResponse(d: unknown): SearchResponse {
  const o = obj(d, 'search')
  return {
    items: arr(o.items, 'search.items', parseProductSummary),
    total: int(o.total, 'search.total', 0),
    page: int(o.page, 'search.page', 1),
    pageSize: int(o.pageSize, 'search.pageSize', 1),
    totalPages: int(o.totalPages, 'search.totalPages', 1),
    facets: arr(o.facets, 'search.facets', parseFacet),
  }
}

export function parseHomeResponse(d: unknown): HomeResponse {
  const o = obj(d, 'home')
  const fs = obj(o.flashSale, 'home.flashSale')
  return {
    banners: arr(o.banners, 'home.banners', (b, p) => {
      const bo = obj(b, p)
      return {
        id: str(bo.id, `${p}.id`),
        image: parseImage(bo.image, `${p}.image`),
        href: str(bo.href, `${p}.href`),
      }
    }),
    flashSale: {
      startsAt: str(fs.startsAt, 'flashSale.startsAt'),
      endsAt: str(fs.endsAt, 'flashSale.endsAt'),
      items: arr(fs.items, 'flashSale.items', (v, p): FlashSaleItem => {
        const vo = obj(v, p)
        return {
          ...parseProductSummary(vo, p),
          flashPrice: money(vo.flashPrice, `${p}.flashPrice`),
          remaining: int(vo.remaining, `${p}.remaining`, 0),
        }
      }),
    },
    hotKeywords: arr(o.hotKeywords, 'home.hotKeywords', str),
    sections: arr(o.sections, 'home.sections', (s, p) => {
      const so = obj(s, p)
      return {
        id: str(so.id, `${p}.id`),
        title: str(so.title, `${p}.title`),
        items: arr(so.items, `${p}.items`, parseProductSummary),
      }
    }),
  }
}

export function parseCartAddResponse(d: unknown): CartAddResponse {
  const o = obj(d, 'cart')
  return {
    productId: str(o.productId, 'cart.productId'),
    variantId: nullable(o.variantId, 'cart.variantId', str),
    quantity: int(o.quantity, 'cart.quantity', 1),
  }
}
