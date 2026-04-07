import { expect, test } from '@playwright/test'

test('status health panel renders core monitoring signals', async ({ page }) => {
  await page.goto('/status')

  await expect(page.getByRole('heading', { name: 'Status command center' })).toBeVisible()
  await expect(page.getByText('API health')).toBeVisible()

  for (const provider of ['Kyber', 'LI.FI', 'CoinGecko', 'Etherscan']) {
    await expect(page.getByText(provider, { exact: true })).toBeVisible()
  }

  await expect(page.getByText('Warn', { exact: false }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Refresh health' })).toBeVisible()
})

test('swap widget critical controls are available', async ({ page }) => {
  await page.goto('/swap')

  await expect(page.getByRole('heading', { name: 'Swap', exact: true })).toBeVisible()
  await expect(page.getByText('You pay', { exact: true })).toBeVisible()
  await expect(page.getByText('You receive', { exact: true })).toBeVisible()

  await expect(page.getByRole('button', { name: 'Max' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Flip tokens' })).toBeVisible()
  await expect(page.locator('button', { hasText: 'Connect wallet' }).first()).toBeVisible()
})

test('status health controls can toggle and refresh', async ({ page }) => {
  await page.goto('/status')

  const autoButton = page.getByRole('button', { name: /^Auto (on|off)$/i })
  await expect(autoButton).toBeVisible()
  await autoButton.click()
  await expect(autoButton).toContainText(/Auto (on|off)/)

  const refreshButton = page.getByRole('button', { name: 'Refresh health' })
  await expect(refreshButton).toBeVisible()
  await refreshButton.click()
  await expect(page.getByText('Last checked:', { exact: false }).first()).toBeVisible()
})

test('status page supports URL-prefill for swap mode', async ({ page }) => {
  const hash = '0x1111111111111111111111111111111111111111111111111111111111111111'
  await page.goto(`/status?mode=swap&fromChain=1&toChain=42161&txHash=${hash}`)

  await expect(page.getByRole('button', { name: 'swap' })).toBeVisible()
  await expect(page.getByText('Swap mode uses source chain only')).toBeVisible()
  await expect(page.locator('input[placeholder="0x... transaction hash"]')).toHaveValue(hash)
})

test('admin dashboard filters and search operate with seeded data', async ({ page }) => {
  const now = Date.now()
  await page.addInitScript((ts) => {
    const payload = {
      state: {
        history: [
          {
            id: 'a1',
            status: 'success',
            createdAt: ts,
            summary: 'Swap 10 USDC → ~0.003 ETH',
            txHash: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
            chainId: 1,
            from: '0x114629C43Fa2528E5295b2982765733Acf3aCadA',
          },
          {
            id: 'b1',
            status: 'failed',
            createdAt: ts - 32 * 24 * 60 * 60 * 1000,
            summary: 'Bridge 25 USDC → ~24.8 USDC (failed)',
            txHash: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
            chainId: 42161,
            from: '0x114629C43Fa2528E5295b2982765733Acf3aCadA',
          },
        ],
      },
      version: 0,
    }
    window.localStorage.setItem('eonswap-session', JSON.stringify(payload))
  }, now)

  await page.goto('/admin?e2eAdmin=1')
  await expect(page.getByRole('heading', { name: 'Transaction dashboard' })).toBeVisible()

  await page.getByRole('button', { name: /success/i }).click()
  await expect(page.getByText('Rows: 1')).toBeVisible()

  await page.getByPlaceholder('Search hash, wallet, summary, chain...').fill('bridge')
  await expect(page.getByText('Rows: 0')).toBeVisible()

  await page.getByPlaceholder('Search hash, wallet, summary, chain...').fill('')
  await page.getByRole('button', { name: /^all$/i }).first().click()
  await page.getByRole('button', { name: /all time/i }).click()
  await expect(page.getByText('Rows: 2')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Export CSV' })).toBeVisible()
})
