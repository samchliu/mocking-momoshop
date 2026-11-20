import { cartCount, cartReducer, clampQuantity, emptyCart, parseCart, quantityInCart } from './cart'

describe('BR-003 cart rules', () => {
  it('BR-003#R2 clamps quantity into [1, min(stock, limit)] as an integer', () => {
    expect(clampQuantity(9, { stock: 3, limit: 5 })).toBe(3)
    expect(clampQuantity(9, { stock: 10, limit: 5 })).toBe(5)
    for (const v of [0, -2, 1.7, Number.NaN])
      expect(clampQuantity(v, { stock: 3, limit: 5 })).toBe(1)
    expect(clampQuantity(2.9, { stock: 3, limit: 5 })).toBe(2)
  })

  it('BR-003#R3 sold-out variants have no valid quantity', () => {
    expect(clampQuantity(1, { stock: 0, limit: 5 })).toBe(0)
  })

  it('BR-003#R5 an optimistic add can be reverted exactly', () => {
    let s = cartReducer(emptyCart, { type: 'add', productId: 'a', variantId: null, quantity: 2 })
    const before = s
    s = cartReducer(s, { type: 'add', productId: 'b', variantId: 'red', quantity: 1 })
    s = cartReducer(s, { type: 'revert', productId: 'b', variantId: 'red', quantity: 1 })
    expect(s).toEqual(before)
    expect(cartCount(s)).toBe(2)
  })

  it('BR-003#R6 count is the sum of quantities; persisted data is validated', () => {
    let s = cartReducer(emptyCart, { type: 'add', productId: 'a', variantId: null, quantity: 2 })
    s = cartReducer(s, { type: 'add', productId: 'a', variantId: null, quantity: 1 })
    s = cartReducer(s, { type: 'add', productId: 'b', variantId: 'x', quantity: 4 })
    expect(cartCount(s)).toBe(7)
    expect(quantityInCart(s, 'a', null)).toBe(3)
    expect(parseCart(JSON.parse(JSON.stringify(s)))).toEqual(s)
    expect(() => parseCart({ x: 1 })).toThrow('cart.lines: expected array')
    expect(() => parseCart({ lines: [{ productId: 'a', variantId: null, quantity: -1 }] })).toThrow(
      'cart.lines[0].quantity: expected integer >= 1',
    )
  })
})
