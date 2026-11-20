import { expect, test, type Page } from '@playwright/test'

const results = (page: Page) => page.getByRole('list', { name: '搜尋結果' })
/** Prices of the cards, in display order ("$24,900" → 24900). */
async function cardPrices(page: Page) {
  const texts = await results(page).locator('li').allInnerTexts()
  return texts.map((t) => Number((t.match(/\$([\d,]+)/)?.[1] ?? 'NaN').replaceAll(',', '')))
}

test.describe('search (REQ-001)', () => {
  test('REQ-001#AC1 header search " iphone " lands on /search/iphone with results', async ({
    page,
  }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    const box = page.getByRole('searchbox', { name: '搜尋商品' })
    await box.fill(' iphone ')
    await box.press('Enter')
    await expect(page).toHaveURL(/\/search\/iphone$/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('「iphone」的搜尋結果')
    await expect(page.getByText(/^共 \d+ 件商品$/)).toBeVisible()
    await expect(results(page).locator('li')).toHaveCount(20)
  })

  test('REQ-001#AC2 sort=price_asc from the URL lists prices ascending', async ({ page }) => {
    await page.goto('/search/iphone?sort=price_asc')
    await expect(page.getByRole('button', { name: '價格低→高' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect(results(page).locator('li').first()).toBeVisible()
    const prices = await cardPrices(page)
    expect(prices.length).toBeGreaterThan(1)
    expect(prices).toEqual([...prices].sort((a, b) => a - b))
  })

  test('REQ-001#AC2 choosing a sort on page 2 goes back to page 1', async ({ page }) => {
    await page.goto('/search/iphone?page=2')
    await expect(results(page)).toBeVisible()
    await page.getByRole('button', { name: '價格高→低' }).click()
    await expect(page).toHaveURL(/\/search\/iphone\?sort=price_desc$/)
  })

  test('REQ-001#AC4 corrects an out-of-range page and pages with next / previous', async ({
    page,
  }) => {
    await page.goto('/search/iphone?page=99')
    await expect(page).toHaveURL(/\/search\/iphone\?page=2$/)
    const pager = page.getByRole('navigation', { name: '分頁', exact: true })
    await expect(pager.getByText('頁數 2/2')).toBeVisible()
    await pager.getByRole('link', { name: '上一頁' }).click()
    await expect(page).toHaveURL(/\/search\/iphone$/)
    await expect(pager.getByText('頁數 1/2')).toBeVisible()
  })

  test('REQ-001#AC6 shows a skeleton while slow, then results', async ({ page }) => {
    await page.goto('/search/iphone?latency=1500')
    await expect(page.getByRole('status', { name: '載入中' })).toBeVisible()
    await expect(results(page)).toBeVisible({ timeout: 10_000 })
  })
})
