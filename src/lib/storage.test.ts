import { readStorage, writeStorage } from './storage'

const parseCount = (d: unknown) => {
  if (typeof d === 'number' && Number.isInteger(d)) return d
  throw new Error('invalid')
}

describe('storage', () => {
  beforeEach(() => localStorage.clear())

  it('round-trips valid data', () => {
    writeStorage('n', 3)
    expect(readStorage('n', parseCount, 0)).toBe(3)
  })
  it('falls back when missing, corrupt, or tampered', () => {
    expect(readStorage('missing', parseCount, 0)).toBe(0)
    localStorage.setItem('n', '{not json')
    expect(readStorage('n', parseCount, 0)).toBe(0)
    localStorage.setItem('n', '"<script>"')
    expect(readStorage('n', parseCount, 0)).toBe(0)
  })
})
