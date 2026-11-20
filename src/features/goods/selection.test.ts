import type { ProductDetail, Variant } from '@/features/catalog'
import { quantityFromInput, resolveSelection } from './selection'

const variants: Variant[] = [
  { id: 'v1', label: '256GB', price: 39900, listPrice: 41900, stock: 12 },
  { id: 'v2', label: '512GB', price: 46900, listPrice: 48900, stock: 2 },
  { id: 'v3', label: '1TB', price: 53900, stock: 0 },
]
const image = { src: 'a.svg', alt: 'a', width: 400, height: 400 }
const product = (over: Partial<ProductDetail> = {}): ProductDetail => ({
  id: 'P1',
  brand: 'Apple',
  name: 'iPhone',
  image,
  images: [image],
  price: 39900,
  listPrice: 41900,
  priceFrom: true,
  tags: [],
  salesCount: 0,
  createdAt: '2026-01-01T00:00:00Z',
  category: [],
  highlights: [],
  variants,
  stock: 14,
  purchaseLimit: 2,
  ...over,
})

describe('resolveSelection', () => {
  it('BR-001#R6 shows the lowest price with 「起」 before a variant is chosen', () => {
    const s = resolveSelection(product(), null)
    expect(s.price).toEqual({ price: 39900, listPrice: 41900, priceFrom: true })
    expect(s.needsVariant).toBe(true)
  })

  it('BR-001#R4 uses the chosen variant price (no 「起」) once selected', () => {
    expect(resolveSelection(product(), 'v2').price).toEqual({
      price: 46900,
      listPrice: 48900,
      priceFrom: false,
    })
    expect(resolveSelection(product(), 'v3').price).toEqual({
      price: 53900,
      listPrice: undefined,
      priceFrom: false,
    })
  })

  it('BR-003#R1 requires a variant only when the product has variants', () => {
    expect(resolveSelection(product(), 'v1').needsVariant).toBe(false)
    expect(resolveSelection(product({ variants: [] }), null).needsVariant).toBe(false)
    // an unknown variant id counts as "not selected"
    expect(resolveSelection(product(), 'nope').needsVariant).toBe(true)
  })

  it('BR-003#R2 max quantity is min(stock of the selection, purchase limit)', () => {
    expect(resolveSelection(product(), 'v1').maxQuantity).toBe(2)
    expect(resolveSelection(product({ purchaseLimit: 5 }), 'v2').maxQuantity).toBe(2)
    expect(
      resolveSelection(product({ variants: [], stock: 3, purchaseLimit: 5 }), null),
    ).toMatchObject({ maxQuantity: 3, soldOut: false })
  })

  it('BR-003#R3 a selection with stock 0 is sold out', () => {
    expect(resolveSelection(product(), 'v3')).toMatchObject({ soldOut: true, maxQuantity: 0 })
    expect(resolveSelection(product({ variants: [], stock: 0 }), null).soldOut).toBe(true)
  })
})

describe('quantityFromInput', () => {
  const limits = { stock: 3, limit: 5 }
  it.each([
    ['9', 3],
    ['0', 1],
    ['-2', 1],
    ['1.7', 1],
    ['', 1],
    ['abc', 1],
    ['2', 2],
  ])('BR-003#R2 corrects input %j to %i', (input, expected) => {
    expect(quantityFromInput(input, limits)).toBe(expected)
  })
})
