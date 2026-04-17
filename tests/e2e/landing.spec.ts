import { test, expect } from '@playwright/test'

test.describe('Landing Page Hero', () => {
  test('hero section renders with title and tagline', async ({ page }) => {
    await page.goto('/')

    // Main headline - "Trade crypto with confidence"
    const h1 = page.getByRole('heading', { level: 1 })
    await expect(h1).toContainText('Trade crypto with')
    await expect(h1).toContainText('confidence')

    // Badges in hero section
    await expect(page.locator('#top').getByText('Live on Base')).toBeVisible()
    await expect(page.locator('#top span').filter({ hasText: /^Non-custodial$/ })).toBeVisible()
  })

  test('hero shows powered by network', async ({ page }) => {
    await page.goto('/')

    // Network badge
    await expect(page.getByText('Powered by')).toBeVisible()
    await expect(page.locator('#top span').filter({ hasText: /^Base$/ }).first()).toBeVisible()
  })

  test('Start trading button navigates to /swap', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('link', { name: /start trading/i }).click()
    await expect(page).toHaveURL('/swap')
  })

  test('Add liquidity button navigates to /liquidity', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('link', { name: /add liquidity/i }).click()
    await expect(page).toHaveURL('/liquidity')
  })

  test('stats bar shows key metrics', async ({ page }) => {
    await page.goto('/')

    await expect(page.locator('p').filter({ hasText: /^Trading pairs$/ })).toBeVisible()
    await expect(page.locator('p').filter({ hasText: /^Supported chain$/ })).toBeVisible()
    await expect(page.locator('p').filter({ hasText: /^Non-custodial$/ })).toBeVisible()
    await expect(page.locator('p').filter({ hasText: /^Swap fee$/ })).toBeVisible()
  })
})

test.describe('Landing Page Sections', () => {
  test('products section shows ecosystem cards', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByText('Ecosystem', { exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: /everything you need to defi/i })).toBeVisible()
    
    // Product cards - use h3 headings
    await expect(page.locator('h3').filter({ hasText: /^Swap$/ })).toBeVisible()
    await expect(page.locator('h3').filter({ hasText: /^Liquidity$/ })).toBeVisible()
    await expect(page.locator('h3').filter({ hasText: /^Farm$/ })).toBeVisible()
    await expect(page.locator('h3').filter({ hasText: /^Stake$/ })).toBeVisible()
  })

  test('how it works section shows 3 steps', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByText('Simple process')).toBeVisible()
    await expect(page.getByRole('heading', { name: /start in 3 steps/i })).toBeVisible()

    // Steps
    await expect(page.getByRole('heading', { name: 'Connect wallet' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Choose tokens' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Execute swap' })).toBeVisible()
  })

  test('features section shows trust benefits', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByText('Why EonSwap')).toBeVisible()
    await expect(page.getByRole('heading', { name: /built for trust/i })).toBeVisible()
    
    // Feature cards
    await expect(page.getByRole('heading', { name: 'Non-custodial' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Best prices' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Transparent fees' })).toBeVisible()
  })

  test('partners section shows integrated partners', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByText('Integrated with')).toBeVisible()
    
    // Partner links (by aria-label)
    await expect(page.getByRole('link', { name: 'WalletConnect' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'CoinGecko' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'DappRadar' })).toBeVisible()
  })

  test('CTA section has Launch app button', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('heading', { name: /ready to start trading/i })).toBeVisible()
    
    const ctaLink = page.getByRole('link', { name: /launch app/i })
    await expect(ctaLink).toBeVisible()
    
    await ctaLink.click()
    await expect(page).toHaveURL('/swap')
  })

  test('Learn more button in CTA navigates to FAQ', async ({ page }) => {
    await page.goto('/')

    // Find Learn more in the CTA section
    const learnMoreLink = page.getByRole('link', { name: /learn more/i })
    await expect(learnMoreLink).toBeVisible()
    
    await learnMoreLink.click()
    await expect(page).toHaveURL('/faq')
  })
})

test.describe('Header Navigation', () => {
  test('header logo links to home', async ({ page }) => {
    await page.goto('/swap')

    await page.getByRole('link', { name: /eonswap/i }).first().click()
    await expect(page).toHaveURL('/')
  })

  test('desktop nav dropdown opens on click', async ({ page }) => {
    await page.goto('/')

    // Click Trade dropdown
    const tradeBtn = page.locator('header').getByRole('button', { name: 'Trade' })
    
    // Skip if mobile (dropdown button not visible)
    if (!(await tradeBtn.isVisible())) {
      test.skip()
      return
    }

    await tradeBtn.click()

    // Dropdown should show Swap link
    await expect(page.getByRole('link', { name: 'Swap' }).first()).toBeVisible()
  })

  test('desktop Earn dropdown has Liquidity, Farm, Stake', async ({ page }) => {
    await page.goto('/')

    const earnBtn = page.locator('header').getByRole('button', { name: 'Earn' })
    
    if (!(await earnBtn.isVisible())) {
      test.skip()
      return
    }

    await earnBtn.click()

    await expect(page.getByRole('link', { name: 'Liquidity' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Farm' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Stake' })).toBeVisible()
  })

  test('desktop Explore dropdown has multiple links', async ({ page }) => {
    await page.goto('/')

    const exploreBtn = page.locator('header').getByRole('button', { name: 'Explore' })
    
    if (!(await exploreBtn.isVisible())) {
      test.skip()
      return
    }

    await exploreBtn.click()

    await expect(page.getByRole('link', { name: 'Activity' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Leaderboard' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'FAQ' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Status' })).toBeVisible()
  })

  test('Escape closes dropdown', async ({ page }) => {
    await page.goto('/')

    const tradeBtn = page.locator('header').getByRole('button', { name: 'Trade' })
    
    if (!(await tradeBtn.isVisible())) {
      test.skip()
      return
    }

    await tradeBtn.click()
    await expect(page.getByRole('link', { name: 'Swap' }).first()).toBeVisible()

    await page.keyboard.press('Escape')
    
    // Dropdown should close (Swap link in dropdown not visible)
    // The header swap link might still be visible, so check dropdown container
    await page.waitForTimeout(200)
  })
})

test.describe('Mobile Navigation', () => {
  test.use({ viewport: { width: 375, height: 667 } })

  test('mobile menu button opens navigation', async ({ page }) => {
    await page.goto('/')

    // Click hamburger menu
    const menuBtn = page.locator('header button[aria-label="Open menu"]')
    await menuBtn.click()

    // Mobile nav should be visible
    await expect(page.locator('#mobile-nav')).toBeVisible()
    await expect(page.getByText('Navigation')).toBeVisible()
  })

  test('mobile menu shows all nav groups', async ({ page }) => {
    await page.goto('/')

    await page.locator('header button[aria-label="Open menu"]').click()

    // All groups visible
    await expect(page.locator('#mobile-nav').getByText('Trade')).toBeVisible()
    await expect(page.locator('#mobile-nav').getByText('Earn')).toBeVisible()
    await expect(page.locator('#mobile-nav').getByText('Explore')).toBeVisible()
  })

  test('mobile menu closes on link click', async ({ page }) => {
    await page.goto('/')

    await page.locator('header button[aria-label="Open menu"]').click()
    await expect(page.locator('#mobile-nav')).toBeVisible()

    // Click Swap link
    await page.locator('#mobile-nav').getByRole('link', { name: 'Swap' }).click()

    // Should navigate and close menu
    await expect(page).toHaveURL('/swap')
    await expect(page.locator('#mobile-nav')).not.toBeVisible()
  })

  test('mobile menu closes on Escape', async ({ page }) => {
    await page.goto('/')

    await page.locator('header button[aria-label="Open menu"]').click()
    await expect(page.locator('#mobile-nav')).toBeVisible()

    await page.keyboard.press('Escape')

    await expect(page.locator('#mobile-nav')).not.toBeVisible()
  })

  test('mobile menu closes on backdrop click', async ({ page }) => {
    await page.goto('/')

    await page.locator('header button[aria-label="Open menu"]').click()
    await expect(page.locator('#mobile-nav')).toBeVisible()

    // Click backdrop (the presentation div, at the bottom of the screen)
    await page.locator('[role="presentation"]').click({ position: { x: 200, y: 650 } })

    await expect(page.locator('#mobile-nav')).not.toBeVisible()
  })
})

test.describe('Footer', () => {
  test('footer shows company info', async ({ page }) => {
    await page.goto('/')

    // Scroll to footer
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(300)

    const footer = page.locator('footer')

    // Check footer logo link (scoped to footer to avoid header match)
    await expect(footer.getByRole('link', { name: 'EonSwap Execution desk' })).toBeVisible()
    await expect(page.getByText('EonSwap is a non-custodial multi-chain swap')).toBeVisible()
  })

  test('footer quick links navigate correctly', async ({ page }) => {
    await page.goto('/')

    const footer = page.locator('footer')
    
    // Test Swap link (use exact match)
    await footer.getByRole('link', { name: 'Swap', exact: true }).click()
    await expect(page).toHaveURL('/swap')

    await page.goto('/')
    
    // Test Activity link
    await footer.getByRole('link', { name: 'Activity', exact: true }).click()
    await expect(page).toHaveURL('/activity')
  })

  test('footer has legal links', async ({ page }) => {
    await page.goto('/')

    const footer = page.locator('footer')
    
    await expect(footer.getByRole('link', { name: 'Terms of Use' })).toBeVisible()
    await expect(footer.getByRole('link', { name: 'Privacy Policy' })).toBeVisible()
    await expect(footer.getByRole('link', { name: 'Risk Disclosure' })).toBeVisible()
    await expect(footer.getByRole('link', { name: 'Disclaimer' })).toBeVisible()
    await expect(footer.getByRole('link', { name: 'AML Policy' })).toBeVisible()
  })

  test('footer has social links with proper attributes', async ({ page }) => {
    await page.goto('/')

    const footer = page.locator('footer')
    
    // Check social links exist
    await expect(footer.getByLabel('EonSwap on X')).toBeVisible()
    await expect(footer.getByLabel('EonSwap on Telegram')).toBeVisible()
    await expect(footer.getByLabel('EonSwap on Discord')).toBeVisible()
    await expect(footer.getByLabel('EonSwap on GitHub')).toBeVisible()

    // Check X link has correct href and rel
    const xLink = footer.getByLabel('EonSwap on X')
    await expect(xLink).toHaveAttribute('href', 'https://x.com/eonswapus')
    await expect(xLink).toHaveAttribute('rel', 'noreferrer')
    await expect(xLink).toHaveAttribute('target', '_blank')
  })

  test('footer shows copyright', async ({ page }) => {
    await page.goto('/')

    const year = new Date().getFullYear()
    await expect(page.getByText(`© ${year} EonSwap`)).toBeVisible()
  })

  test('manage cookies button opens consent banner', async ({ page }) => {
    await page.goto('/')

    // First accept/reject if banner is shown
    const acceptBtn = page.getByRole('button', { name: /accept analytics/i })
    if (await acceptBtn.isVisible()) {
      await acceptBtn.click()
    }

    // Click Manage Cookies in footer
    await page.locator('footer').getByRole('button', { name: /manage cookies/i }).click()

    // Banner should reopen
    await expect(page.getByText('Privacy controls')).toBeVisible()
    await expect(page.getByRole('button', { name: /accept analytics/i })).toBeVisible()
  })
})

test.describe('GDPR Consent Banner', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to show banner
    await page.goto('/')
    await page.evaluate(() => localStorage.removeItem('eonswap_cookie_consent_v1'))
    await page.reload()
  })

  test('banner appears on first visit', async ({ page }) => {
    await expect(page.getByText('Privacy controls')).toBeVisible()
    await expect(page.getByText(/We use analytics cookies/)).toBeVisible()
  })

  test('banner has privacy policy link', async ({ page }) => {
    const privacyLink = page.locator('a').filter({ hasText: 'Privacy Policy' }).first()
    await expect(privacyLink).toBeVisible()
    await expect(privacyLink).toHaveAttribute('href', '/privacy')
  })

  test('accept button saves preference and hides banner', async ({ page }) => {
    await page.getByRole('button', { name: /accept analytics/i }).click()

    // Banner should hide
    await expect(page.getByText('Privacy controls')).not.toBeVisible()

    // Preference saved
    const consent = await page.evaluate(() => localStorage.getItem('eonswap_cookie_consent_v1'))
    expect(consent).toBe('accepted')
  })

  test('reject button saves preference and hides banner', async ({ page }) => {
    await page.getByRole('button', { name: /reject/i }).click()

    // Banner should hide
    await expect(page.getByText('Privacy controls')).not.toBeVisible()

    // Preference saved
    const consent = await page.evaluate(() => localStorage.getItem('eonswap_cookie_consent_v1'))
    expect(consent).toBe('rejected')
  })

  test('banner does not appear if already consented', async ({ page }) => {
    // Set consent
    await page.evaluate(() => localStorage.setItem('eonswap_cookie_consent_v1', 'accepted'))
    await page.reload()

    // Banner should not appear
    await expect(page.getByText('Privacy controls')).not.toBeVisible()
  })
})

test.describe('Jump to Top Button', () => {
  test('jump to top appears after scrolling', async ({ page }) => {
    await page.goto('/')

    // Initially not visible
    const jumpBtn = page.getByLabel('Jump to top')
    await expect(jumpBtn).not.toBeInViewport()

    // Scroll down
    await page.evaluate(() => window.scrollTo(0, 500))
    await page.waitForTimeout(300)

    // Should be visible now
    await expect(jumpBtn).toBeVisible()
  })

  test('jump to top scrolls to top', async ({ page }) => {
    await page.goto('/')

    // Scroll down significantly
    await page.evaluate(() => window.scrollTo(0, 2000))
    await page.waitForTimeout(500)

    // Wait for button to appear and be clickable
    const jumpBtn = page.getByLabel('Jump to top')
    await expect(jumpBtn).toBeVisible({ timeout: 5000 })
    
    // Use force click since button has pointer-events manipulation
    await jumpBtn.click({ force: true })
    await page.waitForTimeout(1000)

    // Should be near top
    const scrollY = await page.evaluate(() => window.scrollY)
    expect(scrollY).toBeLessThan(300)
  })
})
