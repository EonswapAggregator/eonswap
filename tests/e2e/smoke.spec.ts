import { expect, test } from '@playwright/test'

test('core routes render without crash', async ({ page }) => {
  const routes = [
    '/swap',
    '/status',
    '/activity',
    '/docs',
    '/faq',
    '/contact-support',
  ]

  for (const route of routes) {
    await page.goto(route)
    if (route === '/docs') {
      await expect(page).toHaveURL(/\/docs\/?$/)
      await expect(page.locator('body')).toBeVisible()
      continue
    }
    await expect(page.locator('main')).toBeVisible()
    await expect(page.locator('h1').first()).toBeVisible()
  }
})

test('/contact redirects to contact-support', async ({ page }) => {
  await page.goto('/contact')
  await expect(page).toHaveURL(/\/contact-support\/?$/)
  await expect(page.locator('main')).toBeVisible()
})

test('faq category filter works', async ({ page }) => {
  await page.goto('/faq')
  await page.getByRole('button', { name: 'Execution & status' }).click()
  await expect(page.getByText('Why is my transaction pending?')).toBeVisible()
  await expect(page.getByText('Where does route data come from?')).toHaveCount(0)
})
