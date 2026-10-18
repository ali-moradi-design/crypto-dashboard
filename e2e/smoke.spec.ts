import { expect, test } from '@playwright/test'

test('dashboard page loads', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/Crypto dashboard/)
  await expect(page.getByText(/not financial advice/i)).toBeVisible()
})
