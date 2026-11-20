import { expect, test } from '@playwright/test'

test.describe('home (REQ-003)', () => {
  test('REQ-003#AC1 carousel switches with buttons; first banner is eager/high priority', async ({
    page,
  }) => {
    await page.goto('/')
    const carousel = page.getByRole('region', { name: '主打活動' })
    await expect(carousel).toBeVisible()
    const firstImg = carousel.locator('img').first()
    await expect(firstImg).toHaveAttribute('fetchpriority', 'high')
    await expect(firstImg).toHaveAttribute('loading', 'eager')

    await carousel.getByRole('button', { name: '第 2 張' }).click()
    await expect(carousel.getByRole('button', { name: '第 2 張' })).toHaveAttribute(
      'aria-current',
      'true',
    )
  })

  test('REQ-003#AC2 flash sale countdown ticks every second', async ({ page }) => {
    await page.goto('/')
    const timer = page.getByRole('timer', { name: '距離結束' })
    await expect(timer).toHaveText(/^\d{2}:\d{2}:\d{2}$/)
    const first = await timer.textContent()
    await expect(timer).not.toHaveText(first ?? '', { timeout: 2500 })
  })

  test('REQ-003#AC4 hot keyword navigates to /search/<keyword>', async ({ page }) => {
    await page.goto('/')
    await page
      .getByRole('navigation', { name: '熱門搜尋' })
      .getByRole('link', { name: 'dyson' })
      .click()
    await expect(page).toHaveURL(/\/search\/dyson$/)
  })

  test('REQ-003#AC3 product strips render when scrolled into view', async ({ page }) => {
    await page.goto('/')
    const heading = page.getByRole('heading', { level: 2, name: '新品上市' })
    await heading.scrollIntoViewIfNeeded()
    await expect(
      page.locator('section', { has: heading }).getByRole('article').first(),
    ).toBeVisible()
  })
})
