/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'

const EXPANDED = 109
const COLLAPSED = 64

async function scrollToY(page: Page, y: number) {
  await page.evaluate((v) => window.scrollTo(0, v), y)
  // REQ-005 版頭規格「切換時機」: settled within the next animation frame
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r(null))))
}

const headerBox = (page: Page) =>
  page.evaluate(() => {
    const r = document.querySelector('header.site-header')!.getBoundingClientRect()
    return { top: r.top, height: r.height }
  })

const mainDocTop = (page: Page) =>
  page.evaluate(() => document.querySelector('main')!.getBoundingClientRect().top + window.scrollY)

test.describe('fixed collapsing header (REQ-005)', () => {
  for (const path of ['/', '/search/iphone', '/goods/P10001', '/cart']) {
    test(`REQ-005#AC1 版頭在任何捲動位置都貼齊頂端（${path}）`, async ({ page }) => {
      await page.goto(`${path}?latency=0`)
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
      for (const y of [0, 1, 300, 5000]) {
        await scrollToY(page, y)
        expect((await headerBox(page)).top).toBe(0)
      }
    })
  }

  test('REQ-005#AC1 跳到主要內容：連結不被版頭遮住，目標落在版頭下方', async ({ page }) => {
    await page.goto('/search/iphone?latency=0')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await page.keyboard.press('Tab')
    const skip = page.getByRole('link', { name: '跳到主要內容' })
    await expect(skip).toBeFocused()
    const onTop = await skip.evaluate((el) => {
      const r = el.getBoundingClientRect()
      return document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) === el
    })
    expect(onTop).toBe(true)

    await page.keyboard.press('Enter')
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r(null))))
    const { height } = await headerBox(page)
    const mainTop = await page.evaluate(
      () => document.querySelector('main')!.getBoundingClientRect().top,
    )
    expect(mainTop).toBeGreaterThanOrEqual(height - 0.5)
  })

  test('REQ-005#AC2 展開 109px／收合 64px，切換時 <main> 不位移', async ({ page }) => {
    await page.goto('/?latency=0')
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
    const nav = page.getByRole('navigation', { name: '商品分類' })

    expect(Math.abs((await headerBox(page)).height - EXPANDED)).toBeLessThanOrEqual(0.5)
    await expect(nav).toBeVisible()
    const before = await mainDocTop(page)

    await scrollToY(page, 300)
    expect(Math.abs((await headerBox(page)).height - COLLAPSED)).toBeLessThanOrEqual(0.5)
    await expect(nav).toBeHidden()
    expect(await mainDocTop(page)).toBe(before)

    await scrollToY(page, 0)
    expect(Math.abs((await headerBox(page)).height - EXPANDED)).toBeLessThanOrEqual(0.5)
    expect(await mainDocTop(page)).toBe(before)
  })

  test('REQ-005#AC2 重新展開時分類導覽保留水平捲動位置', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 })
    await page.goto('/?latency=0')
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
    const list = page.getByRole('navigation', { name: '商品分類' }).getByRole('list')
    await list.evaluate((el) => {
      el.scrollLeft = 120
    })
    const saved = await list.evaluate((el) => el.scrollLeft)
    expect(saved).toBeGreaterThan(0)

    await scrollToY(page, 300)
    await scrollToY(page, 0)
    expect(await list.evaluate((el) => el.scrollLeft)).toBe(saved)
  })

  test('REQ-005#AC3 焦點在分類導覽內時收合，焦點移到搜尋框（真瀏覽器的焦點修正）', async ({
    page,
  }) => {
    await page.goto('/?latency=0')
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
    await page
      .getByRole('navigation', { name: '商品分類' })
      .getByRole('link', { name: 'Dyson' })
      .focus()
    await scrollToY(page, 300)
    await expect(page.getByRole('searchbox', { name: '搜尋商品' })).toBeFocused()
  })
})
