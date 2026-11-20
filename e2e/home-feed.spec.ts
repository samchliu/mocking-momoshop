import { expect, test, type Page } from '@playwright/test'

const HEADER_COLLAPSED = 64

const feed = (page: Page) => page.getByRole('list', { name: '推薦商品' })
const cards = (page: Page) => feed(page).getByRole('listitem')
const scrollHeight = (page: Page) => page.evaluate<number>('document.documentElement.scrollHeight')

/** Scroll down until the feed reports its end. */
async function loadAll(page: Page, onStep?: () => Promise<void>) {
  const end = page.getByRole('status', { name: '已經到底了' })
  for (let i = 0; i < 80 && !(await end.isVisible()); i++) {
    await page.mouse.wheel(0, 700)
    await page.waitForTimeout(60)
    await onStep?.()
  }
  await expect(end).toBeVisible()
}

/** [posinset, top] of the first card whose top is at or below the collapsed header. */
async function anchor(page: Page) {
  const tops = await cards(page).evaluateAll((els) =>
    els.map((el) => [Number(el.getAttribute('aria-posinset')), el.getBoundingClientRect().top]),
  )
  const below = tops.filter(([, top]) => (top ?? 0) >= HEADER_COLLAPSED)
  below.sort((a, b) => (a[1] ?? 0) - (b[1] ?? 0) || (a[0] ?? 0) - (b[0] ?? 0))
  const first = below[0]
  if (!first) throw new Error('no card below the header')
  return first[0] ?? 0
}

test.describe('home feed (REQ-005)', () => {
  test.skip(({ isMobile }) => isMobile, 'viewport sizes are set explicitly; desktop only')

  test('REQ-005#AC8 1280×800、5 批全部載入後 DOM 卡片 ≤ 35，捲回時捲軸高度不變、首卡位置不變', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/?latency=0')
    await expect(page.getByRole('heading', { level: 2, name: '推薦商品' })).toBeVisible()
    await page.getByRole('heading', { level: 2, name: '推薦商品' }).scrollIntoViewIfNeeded()
    const firstCard = feed(page).locator('li[aria-posinset="1"]')
    await expect(firstCard).toBeVisible()
    const firstTop = await firstCard.evaluate(
      (el) => (el as unknown as { offsetTop: number }).offsetTop,
    )

    let maxRendered = 0
    await loadAll(page, async () => {
      maxRendered = Math.max(maxRendered, await cards(page).count())
    })
    await expect(cards(page).first()).toHaveAttribute('aria-setsize', '100')
    expect(maxRendered).toBeLessThanOrEqual(35)

    const fullHeight = await scrollHeight(page)
    for (let i = 0; i < 80 && (await page.evaluate<number>('window.scrollY')) > 0; i++) {
      await page.mouse.wheel(0, -700)
      await page.waitForTimeout(30)
      expect(await scrollHeight(page)).toBe(fullHeight)
      expect(await cards(page).count()).toBeLessThanOrEqual(35)
    }
    await page.getByRole('heading', { level: 2, name: '推薦商品' }).scrollIntoViewIfNeeded()
    await expect(firstCard).toBeVisible()
    const backTop = await firstCard.evaluate(
      (el) => (el as unknown as { offsetTop: number }).offsetTop,
    )
    expect(Math.abs(backTop - firstTop)).toBeLessThanOrEqual(1)
  })

  test('REQ-005#AC9 ≥1024px 5 欄、<1024px 2 欄；換欄數後錨定商品仍在視窗內', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/?latency=0')
    await page.getByRole('heading', { level: 2, name: '推薦商品' }).scrollIntoViewIfNeeded()
    await expect(feed(page).locator('li[aria-posinset="1"]')).toBeVisible()
    const lefts = async () =>
      new Set(
        await cards(page).evaluateAll((els) => els.map((el) => el.getBoundingClientRect().left)),
      ).size
    expect(await lefts()).toBe(5)

    // scroll into the middle of the loaded rows
    for (let i = 0; i < 6; i++) {
      await page.mouse.wheel(0, 500)
      await page.waitForTimeout(60)
    }
    const before = await anchor(page)

    await page.setViewportSize({ width: 1023, height: 800 })
    await expect.poll(lefts).toBe(2)
    const card = feed(page).locator(`li[aria-posinset="${before}"]`)
    await expect(card).toBeAttached()
    const top = await card.evaluate((el) => el.getBoundingClientRect().top)
    expect(top).toBeGreaterThanOrEqual(HEADER_COLLAPSED)
    expect(top).toBeLessThan(800)
  })

  test('REQ-005#AC10 用 Tab 可依序走過卡片，超出原本渲染範圍也能到達', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/?latency=0')
    // all batches loaded first: this test is about virtualization, not about batch loading
    await page.getByRole('heading', { level: 2, name: '推薦商品' }).scrollIntoViewIfNeeded()
    await loadAll(page)
    await page.getByRole('heading', { level: 2, name: '推薦商品' }).scrollIntoViewIfNeeded()
    const first = feed(page).locator('li[aria-posinset="1"]').getByRole('link')
    await first.focus()
    expect(await cards(page).count()).toBeLessThan(46) // card 46 is not rendered yet
    await page.keyboard.press('Tab', { delay: 0 })
    for (let i = 2; i <= 45; i++) await page.keyboard.press('Tab')
    const pos = await page.evaluate<string | null>(
      "document.activeElement?.closest('li')?.getAttribute('aria-posinset') ?? null",
    )
    expect(pos).toBe('46')
    // the focused card is fully visible below the header
    const box = await feed(page).locator('li[aria-posinset="46"]').boundingBox()
    expect(box?.y ?? 0).toBeGreaterThanOrEqual(HEADER_COLLAPSED)
    expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(800)
  })
})
