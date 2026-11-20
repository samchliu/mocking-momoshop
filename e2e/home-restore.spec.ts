/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'

const HEADER_COLLAPSED = 64
// Slow enough that a re-fetch could not reach batch ≥ 2 before the assertions below run.
const LATENCY = 400

const feed = (page: Page) => page.getByRole('list', { name: '推薦商品' })

/** posinset of the first card whose top is at or below the collapsed header. */
const anchor = (page: Page) =>
  feed(page)
    .getByRole('listitem')
    .evaluateAll((els, headerH) => {
      const below = els
        .map((el) => ({
          pos: Number(el.getAttribute('aria-posinset')),
          top: el.getBoundingClientRect().top,
        }))
        .filter((c) => c.top >= headerH)
        .sort((a, b) => a.top - b.top || a.pos - b.pos)
      return below[0]?.pos ?? 0
    }, HEADER_COLLAPSED)

test.describe('home feed restore (REQ-005#AC11)', () => {
  test.skip(({ isMobile }) => isMobile, 'desktop only')

  test('REQ-005#AC11 從商品頁按返回：已載入的批不重抓，錨定商品回到版頭下方', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto(`/?latency=${LATENCY}`)
    const title = page.getByRole('heading', { level: 2, name: '推薦商品' })
    await title.scrollIntoViewIfNeeded()
    await expect(feed(page)).toBeVisible()

    // scroll until the anchor product is in batch 2 or later
    let pos = 0
    for (let i = 0; i < 60 && pos <= 25; i++) {
      await page.mouse.wheel(0, 400)
      await page.waitForTimeout(150)
      pos = await anchor(page).catch(() => 0)
    }
    expect(pos).toBeGreaterThan(25)
    // let any in-flight batch land so the snapshot is stable
    await expect(page.getByRole('status', { name: '載入中' })).toBeHidden({ timeout: 5000 })
    pos = await anchor(page)

    const card = feed(page).locator(`li[aria-posinset="${pos}"]`)
    const name = (await card.getByRole('heading').textContent()) ?? ''
    await card.getByRole('link').first().click()
    await expect(page).toHaveURL(/\/goods\//)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    await page.goBack()
    await expect(page).toHaveURL(/\/\?latency=/)
    const back = feed(page).locator(`li[aria-posinset="${pos}"]`)
    // well under one latency period: only restored batches can be on screen
    await expect(back).toBeVisible({ timeout: LATENCY / 2 })
    await expect(back.getByRole('heading')).toHaveText(name)
    const top = await back.evaluate((el) => el.getBoundingClientRect().top)
    expect(top).toBeGreaterThanOrEqual(HEADER_COLLAPSED)
    expect(top).toBeLessThan(800)
    await expect(page.getByRole('status', { name: '載入中' })).toBeHidden()
  })

  test('REQ-005#AC11 從 logo 回首頁：重新從第 1 批開始', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto(`/?latency=${LATENCY}`)
    await page.getByRole('heading', { level: 2, name: '推薦商品' }).scrollIntoViewIfNeeded()
    await expect(feed(page)).toBeVisible()
    await feed(page).getByRole('link').first().click()
    await expect(page).toHaveURL(/\/goods\//)
    await page.getByRole('link', { name: 'momo shop 首頁' }).click()
    await expect(page).toHaveURL(/\/$|\/\?/)
    // fresh lifecycle: the page opens at the top, and the feed waits for its trigger zone again
    expect(await page.evaluate(() => window.scrollY)).toBe(0)
    await expect(feed(page)).toHaveCount(0)
  })
})
