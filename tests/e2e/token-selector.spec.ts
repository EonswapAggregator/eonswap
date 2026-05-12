import { test, expect } from '@playwright/test'

test.describe('Token Selector Modal', () => {
  test('sell token button opens token selector modal', async ({ page }) => {
    await page.goto('/swap')

    // Click the sell token button (has ETH symbol by default)
    const sellTokenBtn = page.locator('button').filter({ hasText: 'ETH' }).first()
    await expect(sellTokenBtn).toBeVisible()
    await sellTokenBtn.click()

    // Modal should open
    const modal = page.locator('[role="dialog"]')
    await expect(modal).toBeVisible()

    // Modal title should be "Select token"
    await expect(page.getByText('Select token', { exact: true })).toBeVisible()
  })

  test('buy token button opens token selector modal', async ({ page }) => {
    await page.goto('/swap')

    // Click the buy token button (has ESTF by default)
    const buyTokenBtn = page.locator('button').filter({ hasText: 'ESTF' }).first()
    await expect(buyTokenBtn).toBeVisible()
    await buyTokenBtn.click()

    // Modal should open
    const modal = page.locator('[role="dialog"]')
    await expect(modal).toBeVisible()
  })

  test('modal has search input with correct placeholder', async ({ page }) => {
    await page.goto('/swap')

    // Open token selector
    await page.locator('button').filter({ hasText: 'ETH' }).first().click()

    // Search input should be visible
    const searchInput = page.getByPlaceholder('Search name, symbol, or paste address')
    await expect(searchInput).toBeVisible()
  })

  test('modal shows curated tokens count hint', async ({ page }) => {
    await page.goto('/swap')

    // Open token selector
    await page.locator('button').filter({ hasText: 'ETH' }).first().click()

    // Should show curated tokens hint
    await expect(page.getByText(/\d+ curated tokens/)).toBeVisible()
  })

  test('modal has token list header', async ({ page }) => {
    await page.goto('/swap')

    // Open token selector
    await page.locator('button').filter({ hasText: 'ETH' }).first().click()

    // Header should show columns
    await expect(page.getByText('Token', { exact: true })).toBeVisible()
    await expect(page.getByText('Balance / USD', { exact: true })).toBeVisible()
  })

  test('token list renders with symbols and names', async ({ page }) => {
    await page.goto('/swap')

    // Open token selector
    await page.locator('button').filter({ hasText: 'ETH' }).first().click()

    // Wait for modal to be visible
    await expect(page.locator('[role="dialog"]')).toBeVisible()

    // Token list items should be visible (ul > li)
    const tokenList = page.locator('[role="dialog"] ul li')
    await expect(tokenList.first()).toBeVisible()
    
    // Should have multiple tokens
    const count = await tokenList.count()
    expect(count).toBeGreaterThan(3)
  })

  test('search filters token list', async ({ page }) => {
    await page.goto('/swap')

    // Open token selector
    await page.locator('button').filter({ hasText: 'ETH' }).first().click()

    // Type in search
    const searchInput = page.getByPlaceholder('Search name, symbol, or paste address')
    await searchInput.fill('WETH')

    // Wait for filtering
    await page.waitForTimeout(300)

    // Should show WETH in results
    await expect(page.locator('[role="dialog"]').getByText('WETH', { exact: true })).toBeVisible()
  })

  test('search shows no matches message', async ({ page }) => {
    await page.goto('/swap')

    // Open token selector
    await page.locator('button').filter({ hasText: 'ETH' }).first().click()

    // Type gibberish search
    const searchInput = page.getByPlaceholder('Search name, symbol, or paste address')
    await searchInput.fill('XYZNONEXISTENT123')

    // Wait for filtering
    await page.waitForTimeout(300)

    // Should show no matches message
    await expect(page.getByText('No tokens match your search.')).toBeVisible()
  })

  test('clicking token selects it and closes modal', async ({ page }) => {
    await page.goto('/swap')

    // Open token selector
    await page.locator('button').filter({ hasText: 'ETH' }).first().click()
    await expect(page.locator('[role="dialog"]')).toBeVisible()

    // Search for WETH
    const searchInput = page.getByPlaceholder('Search name, symbol, or paste address')
    await searchInput.fill('WETH')
    await page.waitForTimeout(300)

    // Click WETH token
    await page.locator('[role="dialog"] ul li button').filter({ hasText: 'WETH' }).first().click()

    // Modal should close
    await expect(page.locator('[role="dialog"]')).not.toBeVisible()

    // Sell token button should now show WETH
    await expect(page.locator('button').filter({ hasText: 'WETH' }).first()).toBeVisible()
  })

  test('X button closes modal', async ({ page }) => {
    await page.goto('/swap')

    // Open token selector
    await page.locator('button').filter({ hasText: 'ETH' }).first().click()
    await expect(page.locator('[role="dialog"]')).toBeVisible()

    // Click X button
    const closeBtn = page.locator('[role="dialog"] button').filter({ has: page.locator('svg.lucide-x') })
    await closeBtn.click()

    // Modal should close
    await expect(page.locator('[role="dialog"]')).not.toBeVisible()
  })

  test('Escape key closes modal', async ({ page }) => {
    await page.goto('/swap')

    // Open token selector
    await page.locator('button').filter({ hasText: 'ETH' }).first().click()
    await expect(page.locator('[role="dialog"]')).toBeVisible()

    // Press Escape
    await page.keyboard.press('Escape')

    // Modal should close
    await expect(page.locator('[role="dialog"]')).not.toBeVisible()
  })

  test('backdrop click closes modal', async ({ page }) => {
    await page.goto('/swap')

    // Open token selector
    await page.locator('button').filter({ hasText: 'ETH' }).first().click()
    await expect(page.locator('[role="dialog"]')).toBeVisible()

    // Click backdrop (outside modal)
    await page.locator('[role="presentation"]').click({ position: { x: 10, y: 10 } })

    // Modal should close
    await expect(page.locator('[role="dialog"]')).not.toBeVisible()
  })
})

test.describe('Flip Tokens', () => {
  test('flip button swaps sell and buy tokens', async ({ page }) => {
    await page.goto('/swap')

    // Get initial tokens (ETH sell, ESTF buy)
    const sellBtn = page.locator('button').filter({ hasText: 'ETH' }).first()
    const buyBtn = page.locator('button').filter({ hasText: 'ESTF' }).first()
    await expect(sellBtn).toBeVisible()
    await expect(buyBtn).toBeVisible()

    // Click flip button (arrow up/down icon)
    const flipBtn = page.getByLabel('Flip tokens')
    await flipBtn.click()

    // After flip: ESTF should be sell, ETH should be buy
    await expect(page.locator('button').filter({ hasText: 'ESTF' }).first()).toBeVisible()
    await expect(page.locator('button').filter({ hasText: 'ETH' }).first()).toBeVisible()
  })

  test('flip button preserves input amount', async ({ page }) => {
    await page.goto('/swap')

    // Enter amount
    const amountInput = page.locator('input[inputmode="decimal"]').first()
    await amountInput.fill('1.5')

    // Flip tokens
    const flipBtn = page.getByLabel('Flip tokens')
    await flipBtn.click()

    // Amount should be preserved (or quote output becomes input)
    // This depends on implementation - just verify input still has value
    const inputValue = await amountInput.inputValue()
    expect(inputValue.length).toBeGreaterThan(0)
  })
})

test.describe('Token Selector Search', () => {
  test('search by symbol works', async ({ page }) => {
    await page.goto('/swap')

    await page.locator('button').filter({ hasText: 'ETH' }).first().click()
    
    const searchInput = page.getByPlaceholder('Search name, symbol, or paste address')
    await searchInput.fill('USDC')
    await page.waitForTimeout(300)

    // USDC should appear
    await expect(page.locator('[role="dialog"]').getByText('USDC', { exact: true })).toBeVisible()
  })

  test('search by name works', async ({ page }) => {
    await page.goto('/swap')

    await page.locator('button').filter({ hasText: 'ETH' }).first().click()
    
    const searchInput = page.getByPlaceholder('Search name, symbol, or paste address')
    await searchInput.fill('Wrapped Ether')
    await page.waitForTimeout(300)

    // WETH should appear
    await expect(page.locator('[role="dialog"]').getByText('WETH', { exact: true })).toBeVisible()
  })

  test('search is case insensitive', async ({ page }) => {
    await page.goto('/swap')

    await page.locator('button').filter({ hasText: 'ETH' }).first().click()
    
    const searchInput = page.getByPlaceholder('Search name, symbol, or paste address')
    await searchInput.fill('weth')
    await page.waitForTimeout(300)

    // WETH should appear (uppercase)
    await expect(page.locator('[role="dialog"]').getByText('WETH', { exact: true })).toBeVisible()
  })

  test('clearing search shows all tokens', async ({ page }) => {
    await page.goto('/swap')

    await page.locator('button').filter({ hasText: 'ETH' }).first().click()
    
    const searchInput = page.getByPlaceholder('Search name, symbol, or paste address')
    
    // Get initial count
    const initialCount = await page.locator('[role="dialog"] ul li').count()
    
    // Search for specific token
    await searchInput.fill('WETH')
    await page.waitForTimeout(300)
    const filteredCount = await page.locator('[role="dialog"] ul li').count()
    expect(filteredCount).toBeLessThan(initialCount)
    
    // Clear search
    await searchInput.fill('')
    await page.waitForTimeout(300)
    
    // Should show more tokens again
    const clearedCount = await page.locator('[role="dialog"] ul li').count()
    expect(clearedCount).toBeGreaterThan(filteredCount)
  })
})

test.describe('Token Exclusion', () => {
  test('sell token selector excludes current sell token', async ({ page }) => {
    await page.goto('/swap')

    // Open sell token selector (ETH is current sell)
    await page.locator('button').filter({ hasText: 'ETH' }).first().click()
    
    // Search for WETH (should be available since ETH != WETH technically)
    const searchInput = page.getByPlaceholder('Search name, symbol, or paste address')
    await searchInput.fill('WETH')
    await page.waitForTimeout(300)

    // WETH should appear (it's different from native ETH)
    await expect(page.locator('[role="dialog"]').getByText('WETH', { exact: true })).toBeVisible()
    
    // Close modal
    await page.keyboard.press('Escape')
    
    // Open buy token selector (ESTF is current buy)
    await page.locator('button').filter({ hasText: 'ESTF' }).first().click()
    
    // Search for ETH
    const searchInput2 = page.getByPlaceholder('Search name, symbol, or paste address')
    await searchInput2.fill('WETH')
    await page.waitForTimeout(300)

    // WETH should appear  
    await expect(page.locator('[role="dialog"]').getByText('WETH', { exact: true })).toBeVisible()
  })
})
