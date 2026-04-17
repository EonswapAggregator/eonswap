import { expect, test } from '@playwright/test'

test.describe('Airdrop Page (/airdrop)', () => {
  test.beforeEach(async ({ page }) => {
    // Use domcontentloaded for faster initial load
    await page.goto('/airdrop', { waitUntil: 'domcontentloaded', timeout: 60000 })
    // Wait for React to hydrate
    await page.waitForSelector('[class*="relative"]', { timeout: 15000 }).catch(() => {})
  })

  test('renders without crash', async ({ page }) => {
    // Page renders with hero content - use specific heading
    await expect(page.getByRole('heading', { name: 'ESTF Token Airdrop' })).toBeVisible({ timeout: 15000 })
  })

  test('displays hero section with badge', async ({ page }) => {
    await expect(page.getByText('Airdrop Program')).toBeVisible()
    await expect(page.getByText('Official EonSwap Campaign')).toBeVisible()
  })

  test('displays ESTF Token Airdrop title', async ({ page }) => {
    await expect(page.getByText('ESTF Token', { exact: true })).toBeVisible()
  })

  test('displays stats section', async ({ page }) => {
    await expect(page.getByText('Total Allocation')).toBeVisible()
    await expect(page.getByText('Eligible Wallets')).toBeVisible()
    await expect(page.getByText('Snapshot Date')).toBeVisible()
  })

  test('displays eligibility criteria section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Eligibility Criteria' })).toBeVisible()
    await expect(page.getByText('Early Liquidity Providers')).toBeVisible()
    await expect(page.getByText('Active Traders')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Community Members' })).toBeVisible()
  })

  test('displays timeline section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Airdrop Timeline' })).toBeVisible()
    await expect(page.getByText('Phase 1')).toBeVisible()
    await expect(page.getByText('Phase 2')).toBeVisible()
    await expect(page.getByText('Phase 3')).toBeVisible()
  })

  test('displays security notice', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Security Notice' })).toBeVisible()
    await expect(page.getByText(/never share your seed phrase/i)).toBeVisible()
  })

  test('displays CTA section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /start earning while you wait/i })).toBeVisible()
  })

  test('has link to FAQ', async ({ page }) => {
    const faqLink = page.getByRole('link', { name: /read faq/i })
    await expect(faqLink).toBeVisible()
    await expect(faqLink).toHaveAttribute('href', '/faq')
  })

  test('has link to Liquidity page', async ({ page }) => {
    const liquidityLinks = page.getByRole('link', { name: /liquidity|add liquidity/i })
    await expect(liquidityLinks.first()).toBeVisible()
  })

  test('has link to Swap page', async ({ page }) => {
    const swapLink = page.getByRole('link', { name: /start trading/i })
    await expect(swapLink).toBeVisible()
    await expect(swapLink).toHaveAttribute('href', '/swap')
  })

  test('claim button shows correct state when not connected', async ({ page }) => {
    // When wallet not connected, should show connect button
    const connectBtn = page.getByRole('button', { name: /connect wallet to check/i })
    const claimBtn = page.getByRole('button', { name: /claim coming soon/i })
    
    // One of these should be visible
    const hasConnect = await connectBtn.isVisible().catch(() => false)
    const hasClaim = await claimBtn.isVisible().catch(() => false)
    
    expect(hasConnect || hasClaim).toBe(true)
  })

  test('has external link to official Twitter', async ({ page }) => {
    const twitterLink = page.getByRole('link', { name: /official twitter/i })
    await expect(twitterLink).toBeVisible()
    await expect(twitterLink).toHaveAttribute('target', '_blank')
  })
})
