import { parseProductDetail } from './parse'

const base = {
  id: 'P1',
  brand: 'B',
  name: 'N',
  price: 100,
  salesCount: 0,
  createdAt: '2026-01-01',
  tags: [],
  image: { src: 's', alt: 'a', width: 1, height: 1 },
  category: [],
  images: [],
  highlights: [],
  variants: [],
  stock: 1,
  purchaseLimit: 5,
}

describe('API-001 ProductDetail.specs', () => {
  it('REQ-002#AC11 parses specs in order, trims values, ignores extra fields, allows duplicate labels', () => {
    const d = parseProductDetail({
      ...base,
      specs: [
        { label: ' 顏色 ', value: ' 黑 ', unit: 'x' },
        { label: '顏色', value: '白' },
      ],
    })
    expect(d.specs).toEqual([
      { label: '顏色', value: '黑' },
      { label: '顏色', value: '白' },
    ])
  })

  it('REQ-002#AC11 empty array is valid', () => {
    expect(parseProductDetail({ ...base, specs: [] }).specs).toEqual([])
  })

  it.each([
    ['missing', undefined],
    ['null', null],
    ['blank label', [{ label: '  ', value: 'x' }]],
    ['number value', [{ label: 'a', value: 1 }]],
  ])('REQ-002#AC11 rejects specs that are %s', (_name, specs) => {
    expect(() => parseProductDetail({ ...base, specs })).toThrow(/specs/)
  })
})
