import { expect, test } from '@playwright/test'

const hostedActivity = {
  id: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-7',
  txHash: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  blockNumber: 45974500,
  timestamp: Date.now() - 60_000,
  from: '0x1111111111111111111111111111111111111111',
  amount0In: '1000000000000000000',
  amount1In: '0',
  amount0Out: '0',
  amount1Out: '2500000000000000',
  to: '0x2222222222222222222222222222222222222222',
}

test('activity page renders hosted indexed logs without requiring RPC fallback', async ({
  page,
}) => {
  await page.route(/.*(\/__eonswap-relay)?\/api\/activity.*/u, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [hostedActivity],
        meta: {
          chainId: 8453,
          source: 'hosted-e2e',
        },
      }),
    })
  })

  await page.route('**/__base-rpc', async (route) => {
    const request = route.request()
    const body = request.postDataJSON?.() as { method?: string } | undefined
    if (body?.method === 'eth_blockNumber') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, result: '0x2bda0e4' }),
      })
      return
    }

    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        error: { code: -32000, message: 'RPC disabled in hosted activity e2e' },
      }),
    })
  })

  await page.goto('/activity', { waitUntil: 'domcontentloaded' })

  await expect(page.getByRole('heading', { name: /transaction/i })).toBeVisible()
  await expect(page.getByText('Market Activity')).toBeVisible()
  await expect(page.getByText('1 total')).toBeVisible()
  const table = page.getByRole('table')
  if (await table.isVisible().catch(() => false)) {
    await expect(
      table.getByText(/Swap 1\.0000 ESTF \/ 0\.002500 WETH/u),
    ).toBeVisible()
    await expect(table.getByText('ESTF/WETH')).toBeVisible()
  } else {
    const card = page.locator('article').filter({
      hasText: /Swap 1\.0000 ESTF \/ 0\.002500 WETH/u,
    })
    await expect(card).toBeVisible()
    await expect(card.getByText('ESTF/WETH')).toBeVisible()
  }
  await expect(page.getByRole('link', { name: /view/i }).first()).toHaveAttribute(
    'href',
    /0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/u,
  )
})
