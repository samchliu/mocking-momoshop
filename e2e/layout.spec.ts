/// <reference lib="dom" />
import { expect, test } from '@playwright/test'

const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16)
  return `rgb(${n >> 16}, ${(n >> 8) & 255}, ${n & 255})`
}

test.describe('site skeleton (REQ-004)', () => {
  test('REQ-004#AC1 main container width and page background', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop widths only')
    for (const [vw, expected] of [
      [1440, 1220],
      [1000, 968],
    ] as const) {
      await page.setViewportSize({ width: vw, height: 900 })
      await page.goto('/search/iphone?latency=0')
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      const m = await page.evaluate(() => {
        const main = document.querySelector('main')!
        const r = main.getBoundingClientRect()
        const header = document.querySelector('header')!.getBoundingClientRect()
        return {
          width: r.width,
          left: r.left,
          mainBg: getComputedStyle(main).backgroundColor,
          pageBg: getComputedStyle(main.parentElement!).backgroundColor,
          headerWidth: header.width,
          vw: document.documentElement.clientWidth,
        }
      })
      expect(Math.abs(m.width - Math.min(1220, m.vw - 32))).toBeLessThanOrEqual(1)
      if (m.vw === vw) expect(Math.abs(m.width - expected)).toBeLessThanOrEqual(1)
      expect(m.left).toBeGreaterThan(0)
      expect(m.mainBg).toBe(rgb('#ffffff'))
      expect(m.pageBg).toBe(rgb('#f2f2f2'))
      expect(m.headerWidth).toBe(m.vw)
    }
  })

  test('REQ-004#AC4 category nav is one row, scrolls, ≥44px targets on mobile', async ({
    page,
    isMobile,
  }) => {
    await page.goto('/?latency=0')
    const nav = page.getByRole('navigation', { name: '商品分類' })
    const boxes = await nav.getByRole('link').evaluateAll((els) =>
      els.map((e) => {
        const r = e.getBoundingClientRect()
        return { top: r.top, w: r.width, h: r.height }
      }),
    )
    expect(new Set(boxes.map((b) => Math.round(b.top))).size).toBe(1)
    if (isMobile) for (const b of boxes) expect(Math.min(b.w, b.h)).toBeGreaterThanOrEqual(44)
    const last = nav.getByRole('link', { name: '手機殼' })
    await last.focus()
    const inside = await nav.evaluate((n) => {
      const a = [...n.querySelectorAll('a')].at(-1)!.getBoundingClientRect()
      const r = n.getBoundingClientRect()
      return a.left >= r.left - 1 && a.right <= r.right + 1
    })
    expect(inside).toBe(true)
  })
})

test.describe('goods layout (REQ-002)', () => {
  test('REQ-002#AC8 two columns ≥1024px (gallery 440px), single column below', async ({
    page,
    isMobile,
  }) => {
    await page.goto('/goods/P10001?latency=0')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    const gallery = page.getByTestId('gallery')
    const title = page.getByRole('heading', { level: 1 })
    const g = (await gallery.boundingBox())!
    const t = (await title.boundingBox())!
    if (isMobile) {
      expect(t.y).toBeGreaterThan(g.y + g.height - 1)
    } else {
      expect(Math.abs(g.width - 440)).toBeLessThanOrEqual(2)
      expect(t.x).toBeGreaterThan(g.x + g.width)
    }
  })
})
