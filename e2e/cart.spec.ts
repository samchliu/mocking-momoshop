import { expect, test } from '@playwright/test'

const lines = Array.from({ length: 6 }, (_, i) => ({
  productId: `P${20001 + i}`,
  variantId: null,
  quantity: 1,
}))

test.describe('cart (REQ-006)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(
      (seed) => {
        localStorage.setItem('cart:v1', JSON.stringify({ lines: seed }))
      },
      [{ productId: 'P10002', variantId: null, quantity: 1 }, ...lines],
    )
  })

  test('REQ-006#AC12 keyboard, 44px targets on mobile, sticky checkout bar', async ({ page }) => {
    await page.goto('/cart?latency=0')
    await expect(page.getByRole('link', { name: 'AirPods Pro 3' })).toBeVisible()

    // keyboard: toggle the first line's checkbox with Space
    const first = page.getByRole('checkbox', { name: '選取 AirPods Pro 3' })
    await first.focus()
    await page.keyboard.press('Space')
    await expect(first).not.toBeChecked()

    const width = page.viewportSize()?.width ?? 0
    if (width < 768) {
      for (const name of [
        '減少 AirPods Pro 3 數量',
        '增加 AirPods Pro 3 數量',
        '移除 AirPods Pro 3',
      ]) {
        const box = await page.getByRole('button', { name }).boundingBox()
        expect(box?.width).toBeGreaterThanOrEqual(44)
        expect(box?.height).toBeGreaterThanOrEqual(44)
      }
    }

    // the checkout bar stays at the viewport bottom and never covers the last line once scrolled to the end
    const bar = page.getByRole('button', { name: /^結帳\(/ })
    await expect(bar).toBeInViewport()
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
    const items = page.getByRole('list', { name: '購物車品項' }).getByRole('listitem')
    const lastBottom = await items.last().evaluate((el) => el.getBoundingClientRect().bottom)
    const barTop = await page
      .locator('[data-total]')
      .evaluate((el) => el.closest('div')?.getBoundingClientRect().top ?? 0)
    expect(lastBottom).toBeLessThanOrEqual(barTop)
    await expect(bar).toBeInViewport()
  })
})
