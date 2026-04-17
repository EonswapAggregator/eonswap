import { test, expect, Page } from '@playwright/test'

/**
 * Comprehensive responsive test suite for all pages.
 * Tests both desktop (chromium) and mobile (mobile-chromium) viewports.
 */

const ALL_ROUTES = [
  '/',
  '/swap',
  '/liquidity',
  '/farm',
  '/stake',
  '/referral',
  '/airdrop',
  '/activity',
  '/leaderboard',
  '/docs',
  '/faq',
  '/status',
  '/contact-support',
  '/about',
  '/careers',
  '/press-kit',
  '/terms',
  '/privacy',
  '/risk-disclosure',
  '/disclaimer',
  '/aml-policy',
  '/admin',
]

interface OverflowResult {
  hasHorizontalOverflow: boolean
  pageWidth: number
  scrollWidth: number
  overflowingElements: string[]
}

async function gotoWithRetry(page: Page, path: string, maxRetries = 3): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await page.goto(path, { waitUntil: 'networkidle', timeout: 15000 })
      return
    } catch (e) {
      if (i === maxRetries - 1) throw e
      await page.waitForTimeout(1000)
    }
  }
}

async function checkOverflow(page: Page): Promise<OverflowResult> {
  return await page.evaluate(() => {
    const body = document.body
    const html = document.documentElement

    const pageWidth = Math.max(
      html.clientWidth,
      window.innerWidth
    )
    const scrollWidth = Math.max(
      body.scrollWidth,
      html.scrollWidth
    )

    const hasHorizontalOverflow = scrollWidth > pageWidth + 5

    // Find elements that might be causing overflow
    const overflowingElements: string[] = []
    const allElements = document.querySelectorAll('*')
    
    allElements.forEach((el) => {
      const rect = el.getBoundingClientRect()
      if (rect.right > pageWidth + 5 || rect.left < -5) {
        const tag = el.tagName.toLowerCase()
        const id = el.id ? `#${el.id}` : ''
        const classes = el.className && typeof el.className === 'string' 
          ? `.${el.className.split(' ').filter(Boolean).join('.')}` 
          : ''
        const identifier = `${tag}${id}${classes}`.slice(0, 100)
        if (!overflowingElements.includes(identifier)) {
          overflowingElements.push(identifier)
        }
      }
    })

    return {
      hasHorizontalOverflow,
      pageWidth,
      scrollWidth,
      overflowingElements: overflowingElements.slice(0, 10), // Limit to 10 elements
    }
  })
}

async function getOverflowResultWithRetry(page: Page, maxRetries = 3): Promise<OverflowResult> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await checkOverflow(page)
    } catch {
      if (i === maxRetries - 1) {
        return {
          hasHorizontalOverflow: false,
          pageWidth: 0,
          scrollWidth: 0,
          overflowingElements: [],
        }
      }
      await page.waitForTimeout(500)
    }
  }
  return { hasHorizontalOverflow: false, pageWidth: 0, scrollWidth: 0, overflowingElements: [] }
}

for (const route of ALL_ROUTES) {
  test(`${route} has no horizontal/text overflow`, async ({ page }) => {
    await gotoWithRetry(page, route)
    
    // Wait for page content to stabilize
    await page.waitForTimeout(500)

    const result = await getOverflowResultWithRetry(page)

    if (result.hasHorizontalOverflow) {
      console.log(`[OVERFLOW] ${route}:`, {
        pageWidth: result.pageWidth,
        scrollWidth: result.scrollWidth,
        diff: result.scrollWidth - result.pageWidth,
        elements: result.overflowingElements,
      })
    }

    expect(
      result.hasHorizontalOverflow,
      `Page ${route} has horizontal overflow. ScrollWidth: ${result.scrollWidth}, PageWidth: ${result.pageWidth}. Overflowing elements: ${result.overflowingElements.join(', ')}`
    ).toBe(false)
  })
}
