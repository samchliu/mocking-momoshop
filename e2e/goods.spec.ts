import { expect, test } from '@playwright/test'

test.describe('goods (REQ-002)', () => {
  test('REQ-002#AC4 pick a variant, add to cart, header badge shows 1', async ({ page }) => {
    await page.goto('/goods/P10001?latency=0')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await page.getByText('256GB', { exact: true }).click()
    await page.getByRole('button', { name: '放入購物車' }).click()
    await expect(page.getByText('已加入購物車')).toBeVisible()
    await expect(page.getByRole('link', { name: '購物車，1 件商品' })).toBeVisible()
  })

  test('REQ-002#AC7 legacy GoodsDetail.jsp URL lands on /goods/:id', async ({ page }) => {
    await page.goto('/goods/GoodsDetail.jsp?i_code=P10002')
    await expect(page).toHaveURL(/\/goods\/P10002$/)
    await expect(page.getByRole('heading', { level: 1, name: 'AirPods Pro 3' })).toBeVisible()
  })
})
