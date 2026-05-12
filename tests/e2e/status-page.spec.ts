import { test, expect } from '@playwright/test'

test.describe('StatusPage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/status')
    // Wait for initial health check to complete
    await page.waitForSelector('text=Service Health', { timeout: 10000 })
  })

  test('renders status dashboard with all sections', async ({ page }) => {
    // Header section
    await expect(page.getByText('System Status')).toBeVisible()
    await expect(page.getByText('Status Dashboard')).toBeVisible()

    // Quick stats bar
    await expect(page.getByText('Uptime', { exact: true })).toBeVisible()
    await expect(page.getByText('TPS', { exact: true })).toBeVisible()
    await expect(page.getByText('Gas (Gwei)')).toBeVisible()
    await expect(page.getByText('Block Time')).toBeVisible()

    // Uptime history
    await expect(page.getByText('24-Hour Uptime')).toBeVisible()

    // Service health section
    await expect(page.getByText('Service Health')).toBeVisible()
    await expect(page.getByText('EonSwap API')).toBeVisible()
    await expect(page.getByText('CoinGecko')).toBeVisible()
    await expect(page.getByText('EVM RPC')).toBeVisible()
    await expect(page.getByText('Monitor Relay').first()).toBeVisible()

    // Transaction tracker
    await expect(page.getByText('Transaction Tracker')).toBeVisible()
    await expect(page.getByPlaceholder(/Enter transaction hash/i)).toBeVisible()
  })

  test('refresh button works', async ({ page }) => {
    const refreshBtn = page.getByRole('button', { name: /Refresh All/i })
    await expect(refreshBtn).toBeVisible({ timeout: 5000 })
    await expect(refreshBtn).toBeEnabled({ timeout: 5000 })

    await refreshBtn.click()
    // Wait for any loading state
    await page.waitForTimeout(500)

    // Verify page is still responsive
    await expect(page.locator('main')).toBeVisible()
  })

  test('transaction tracker validates input', async ({ page }) => {
    const input = page.getByPlaceholder(/Enter transaction hash/i)
    const checkBtn = page.getByRole('button', { name: /Check Status/i })

    // Should be disabled with empty input
    await expect(checkBtn).toBeDisabled()

    // Invalid hash
    await input.fill('invalid')
    await expect(checkBtn).toBeDisabled()

    // Valid hash format
    await input.fill('0x' + 'a'.repeat(64))
    await expect(checkBtn).toBeEnabled()
  })

  test('chain selector works', async ({ page }) => {
    const chainSelect = page.locator('select')
    await expect(chainSelect).toBeVisible()

    // Should have chain options
    const options = await chainSelect.locator('option').allTextContents()
    expect(options.length).toBeGreaterThan(0)
  })

  test('health status indicators are visible', async ({ page }) => {
    // Wait for health checks to complete (look for any status badge)
    await page.waitForSelector('[role="status"]', { timeout: 15000 })

    // Should show status indicators
    const statusDots = page.locator('[role="status"]')
    expect(await statusDots.count()).toBeGreaterThan(0)
  })

  test('copy button works for transaction hash', async ({ page }) => {
    const input = page.getByPlaceholder(/Enter transaction hash/i)
    const testHash = '0x' + 'a'.repeat(64)

    await input.fill(testHash)

    // Copy button should appear
    const copyBtn = page.locator('button[title="Copy hash"]')
    await expect(copyBtn).toBeVisible()

    // Click copy
    await copyBtn.click()

    // Should show checkmark briefly
    await expect(page.locator('svg.text-emerald-400').first()).toBeVisible({ timeout: 3000 })
  })

  test('URL params pre-fill transaction hash', async ({ page }) => {
    const testHash = '0x' + 'b'.repeat(64)
    await page.goto(`/status?tx=${testHash}`)

    const input = page.getByPlaceholder(/Enter transaction hash/i)
    await expect(input).toHaveValue(testHash)
  })

  test('responsive: mobile layout has no overflow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/status')

    // Check page width
    const body = await page.evaluate(() => ({
      scrollWidth: document.body.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }))

    expect(body.scrollWidth).toBeLessThanOrEqual(body.clientWidth + 5)
  })

  test('accessibility: status dots have aria labels', async ({ page }) => {
    await page.waitForSelector('[role="status"]', { timeout: 15000 })

    const statusDots = page.locator('[role="status"]')
    const count = await statusDots.count()

    for (let i = 0; i < Math.min(count, 5); i++) {
      const ariaLabel = await statusDots.nth(i).getAttribute('aria-label')
      expect(ariaLabel).toBeTruthy()
      expect(['Operational', 'Checking', 'Issue detected']).toContain(ariaLabel)
    }
  })
})
