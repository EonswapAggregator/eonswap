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
