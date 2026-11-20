import { expect, test } from '@playwright/test'

test.describe('smoke', () => {
  test('page renders without console errors', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
    page.on('pageerror', (e) => errors.push(e.message))

    await page.goto('/')
    await expect(page.getByRole('main')).toBeAttached()
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    expect(errors).toEqual([])
  })

  test('skip link moves focus to main content', async ({ page }) => {
    await page.goto('/')
    // Routes are lazy-loaded: wait for the page to render before interacting.
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await page.keyboard.press('Tab')
    await expect(page.getByRole('link', { name: '跳到主要內容' })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.locator('#main')).toBeFocused()
  })

  test('ships a Content-Security-Policy', async ({ page }) => {
    await page.goto('/')
    const csp = await page
      .locator('meta[http-equiv="Content-Security-Policy"]')
      .getAttribute('content')
    expect(csp).toContain("script-src 'self'")
  })

  test('unknown routes show a not-found page (SPA fallback works)', async ({ page }) => {
    await page.goto('/no-such-page')
    await expect(page.getByRole('heading', { name: '找不到這個頁面' })).toBeVisible()
    await page.getByRole('link', { name: '回到首頁' }).click()
    await expect(page).toHaveURL('/')
  })

  test('offline banner reacts to connectivity', async ({ page, context }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await context.setOffline(true)
    await expect(page.getByRole('alert')).toContainText('離線')
    await context.setOffline(false)
    await expect(page.getByRole('alert')).toHaveCount(0)
  })

  // Visual regression — enable once the layout is in place:
  // test('visual', async ({ page }) => {
  //   await page.goto('/')
  //   await expect(page).toHaveScreenshot('home.png', { fullPage: true })
  // })
})
