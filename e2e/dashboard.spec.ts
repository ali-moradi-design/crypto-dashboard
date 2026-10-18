import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { mockGate } from './gate-mock.ts'

test.describe('dashboard', () => {
  test('loads markets, pair stats, chart, order book and trades from the exchange', async ({
    page,
  }) => {
    await mockGate(page)
    await page.goto('/')
    await expect(page).toHaveURL(/\/en\/BTC_USDT$/)

    await expect(page.getByRole('status').filter({ hasText: 'Live' })).toBeVisible()
    const markets = page.getByRole('region', { name: 'Markets' })
    await expect(markets.getByRole('rowheader')).toHaveCount(20)
    await expect(markets.getByRole('row', { name: /BTC\/USDT/ })).toContainText('81,000.0')

    const header = page.getByRole('region', { name: 'BTC/USDT' }).first()
    await expect(header).toContainText('81,000.0')
    await expect(page.getByTestId('candle-chart').locator('canvas').first()).toBeVisible()
    await expect(page.getByRole('region', { name: 'Order book' })).toContainText('Spread')
    await expect(page.getByRole('region', { name: 'Recent trades' }).getByRole('row')).toHaveCount(
      3,
    )
    await expect(page.getByText('Not financial advice.')).toBeVisible()
  })

  test('applies live prices and trades', async ({ page }) => {
    const gate = await mockGate(page)
    await page.goto('/en/BTC_USDT')
    await expect.poll(() => gate.subscriptions()).toContain('spot.tickers:BTC_USDT')

    gate.pushTicker('BTC_USDT', 81234.5, 2.25)
    const row = page
      .getByRole('region', { name: 'Markets' })
      .getByRole('row', { name: /BTC\/USDT/ })
    await expect(row).toContainText('81,234.5')
    await expect(row).toContainText('+2.25%')
    await expect(row.getByText('81,234.5')).toHaveAttribute('data-flash', /^up-/)
    await expect(page).toHaveTitle(/81,234\.5 BTC\/USDT/)

    await expect.poll(() => gate.subscriptions()).toContain('spot.trades:BTC_USDT')
    gate.pushTrade('BTC_USDT', 81240.1, 'buy')
    await expect(
      page.getByRole('region', { name: 'Recent trades' }).getByRole('row').nth(1),
    ).toContainText('81,240.1')
  })

  test('selecting a market opens it and resubscribes', async ({ page }) => {
    const gate = await mockGate(page)
    await page.goto('/en/BTC_USDT')
    await page
      .getByRole('region', { name: 'Markets' })
      .getByRole('row', { name: /ETH\/USDT/ })
      .click()

    await expect(page).toHaveURL(/\/en\/ETH_USDT$/)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('ETH/USDT')
    await expect.poll(() => gate.subscriptions()).toContain('spot.order_book:ETH_USDT,20,100ms')
    await expect.poll(() => gate.subscriptions()).not.toContain('spot.order_book:BTC_USDT,20,100ms')
  })

  test('search and favorites, kept after reload', async ({ page }) => {
    await mockGate(page)
    await page.goto('/en/BTC_USDT')
    const markets = page.getByRole('region', { name: 'Markets' })

    await markets.getByRole('searchbox').fill('sol')
    await expect(markets.getByRole('rowheader')).toHaveCount(1)
    await markets.getByRole('searchbox').fill('')

    await markets.getByRole('button', { name: 'Favorite DOGE/USDT' }).click()
    await page.reload()
    await markets.getByRole('button', { name: 'Favorites' }).click()
    await expect(markets.getByRole('rowheader')).toHaveCount(1)
    await expect(markets.getByRole('rowheader')).toContainText('DOGE/USDT')
  })

  test('reconnects after the connection drops', async ({ page }) => {
    const gate = await mockGate(page)
    await page.goto('/en/BTC_USDT')
    await expect(page.getByRole('status').filter({ hasText: 'Live' })).toBeVisible()

    gate.dropConnection()
    await expect.poll(() => gate.connections(), { timeout: 10_000 }).toBe(2)
    await expect(page.getByRole('status').filter({ hasText: 'Live' })).toBeVisible()
    await expect.poll(() => gate.subscriptions()).toContain('spot.tickers:BTC_USDT')
  })

  test('Persian is right-to-left with Persian digits', async ({ page }) => {
    await mockGate(page)
    await page.goto('/fa/BTC_USDT')
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    await expect(page.getByText('این توصیهٔ مالی نیست.')).toBeVisible()
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.locator('main')).toContainText('۸۱٬۰۰۰٫۰')
  })

  test('price alert fires an in-page notice', async ({ page, context }) => {
    await context.grantPermissions(['notifications'])
    const gate = await mockGate(page)
    await page.goto('/en/BTC_USDT')
    await page.getByRole('button', { name: /price alerts for BTC\/USDT/i }).click()
    await page.getByLabel(/target price/i).fill('82000')
    await page.getByRole('button', { name: 'Add alert' }).click()
    await expect(page.getByText('Rises to')).toBeVisible()
    await page.keyboard.press('Escape')

    await expect.poll(() => gate.subscriptions()).toContain('spot.tickers:BTC_USDT')
    gate.pushTicker('BTC_USDT', 82010)
    await expect(page.getByText(/Alert: BTC\/USDT reached 82,000/)).toBeVisible()
  })

  test('has no serious accessibility violations', async ({ page }) => {
    await mockGate(page)
    await page.goto('/en/BTC_USDT')
    await expect(page.getByRole('status').filter({ hasText: 'Live' })).toBeVisible()
    const results = await new AxeBuilder({ page })
      .exclude('[data-testid="candle-chart"]') // third-party canvas
      .analyze()
    const serious = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    )
    expect(serious.map((v) => `${v.id}: ${String(v.nodes.length)}`)).toEqual([])
  })

  test('panels can be resized and the layout is remembered', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'resizing is a desktop layout')
    await mockGate(page)
    await page.goto('/en/BTC_USDT')
    const markets = page.getByRole('region', { name: 'Markets' })
    const before = (await markets.boundingBox())?.width ?? 0

    const gap = page.getByRole('separator').first()
    const box = await gap.boundingBox()
    if (!box) throw new Error('no separator')
    await page.mouse.move(box.x + box.width / 2, box.y + 200)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2 + 120, box.y + 200, { steps: 8 })
    await page.mouse.up()
    await expect
      .poll(async () => (await markets.boundingBox())?.width ?? 0)
      .toBeGreaterThan(before + 100)

    await page.reload()
    await expect
      .poll(
        async () => (await page.getByRole('region', { name: 'Markets' }).boundingBox())?.width ?? 0,
      )
      .toBeGreaterThan(before + 100)
  })

  test('the page itself never scrolls on desktop', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'phones scroll the stacked layout')
    await mockGate(page)
    await page.goto('/en/BTC_USDT')
    await expect(page.getByRole('region', { name: 'Recent trades' }).getByRole('row')).toHaveCount(
      3,
    )
    const { scroll, client } = await page.evaluate(() => ({
      scroll: document.documentElement.scrollHeight,
      client: document.documentElement.clientHeight,
    }))
    expect(scroll).toBe(client)
  })

  for (const [width, height] of [
    [1024, 768],
    [1280, 720],
    [1920, 1080],
  ] as const) {
    for (const lang of ['en', 'tr', 'fa']) {
      test(`no clipped text at ${String(width)}x${String(height)} (${lang})`, async ({
        page,
      }, testInfo) => {
        test.skip(testInfo.project.name === 'mobile', 'desktop sizes')
        await page.setViewportSize({ width, height })
        await mockGate(page)
        await page.goto(`/${lang}/PEPE_USDT`)
        await expect(page.getByRole('region').nth(1).getByRole('rowheader')).toHaveCount(20)
        const clipped = await page.evaluate(() =>
          [
            ...document.querySelectorAll(
              'main th, main td, main [role="cell"], main [role="columnheader"]',
            ),
          ]
            .filter((el) => el.checkVisibility() && el.scrollWidth > el.clientWidth + 1)
            .map((el) => el.textContent.trim()),
        )
        expect(clipped).toEqual([])
      })
    }
  }
})
