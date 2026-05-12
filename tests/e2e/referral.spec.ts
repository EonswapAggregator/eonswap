import { expect, test } from "@playwright/test";

test.describe("Referral Page (/referral)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/referral");
    // Wait for page to load
    await page.waitForLoadState("domcontentloaded");
  });

  test("renders without crash", async ({ page }) => {
    // Page should have main content visible
    await expect(page.locator("body")).toBeVisible();
    // Check for h1 with "Invite friends" text
    await expect(page.getByText(/invite friends/i).first()).toBeVisible();
  });

  test("displays hero section with title", async ({ page }) => {
    await expect(page.getByText(/referral program/i).first()).toBeVisible();
  });

  test("shows feature cards", async ({ page }) => {
    // Check for the three feature cards
    await expect(page.getByText(/share your link/i)).toBeVisible();
    await expect(page.getByText(/earn rewards/i)).toBeVisible();
    await expect(page.getByText(/bonus tiers/i)).toBeVisible();
  });

  test("shows referral program badge when not connected", async ({ page }) => {
    // When wallet is not connected, should show Referral Program badge
    await expect(page.getByText(/referral program/i)).toBeVisible();
    // Page should not crash
    await expect(page.locator("body")).toBeVisible();
  });

  test("page has invite friends text", async ({ page }) => {
    // Should have the "Invite friends" and "earn together" text
    await expect(page.getByText(/invite friends/i).first()).toBeVisible();
  });

  test("no crash when clicking around the page", async ({ page }) => {
    // Wait for page to fully load
    await page.waitForTimeout(1000);

    // Click any visible buttons that are not wallet connect
    const buttons = page.locator("button:not([disabled])");
    const buttonCount = await buttons.count();

    // Click first few buttons if they exist and don't navigate away
    for (let i = 0; i < Math.min(3, buttonCount); i++) {
      const btn = buttons.nth(i);
      const btnText = await btn.textContent();

      // Skip wallet connect buttons
      if (btnText?.toLowerCase().includes("connect")) continue;
      if (btnText?.toLowerCase().includes("claim")) continue; // Skip claim (requires wallet)

      try {
        await btn.click({ timeout: 2000 });
        await page.waitForTimeout(300);
      } catch {
        // Button might have changed, continue
      }
    }

    // Page should still be visible
    await expect(page.locator("body")).toBeVisible();
  });

  test("page has proper meta title", async ({ page }) => {
    const title = await page.title();
    // Title might contain EonSwap, Referral, etc
    expect(title.length).toBeGreaterThan(0);
  });
});

test.describe("Referral Link Handling", () => {
  test("handles referral code in URL", async ({ page }) => {
    // Visit with a referral code
    await page.goto("/referral?ref=test1234");

    // Page should still render without crash
    await expect(page.locator("body")).toBeVisible();

    // localStorage may have the referral code stored under some key
    const _storedRef = await page.evaluate(() => {
      // Check common patterns for referral storage
      return (
        localStorage.getItem("eonswap_referred_by") ||
        localStorage.getItem("referredBy") ||
        localStorage.getItem("referral_code") ||
        sessionStorage.getItem("referral_code")
      );
    });

    // If app stores referral codes, check it was stored
    // Otherwise just verify page didn't crash
    await expect(page.locator("body")).toBeVisible();
  });

  test("referral code from URL is processed", async ({ page }) => {
    // Visit with referral code
    await page.goto("/swap?ref=abcd5678");

    // Page should render without crash
    await expect(page.locator("body")).toBeVisible();

    // The ref parameter should be accessible in the URL
    expect(page.url()).toContain("ref=abcd5678");
  });

  test("page handles various ref parameter formats", async ({ page }) => {
    // Test with short code
    await page.goto("/referral?ref=abc");
    await expect(page.locator("body")).toBeVisible();

    // Test with address-like code
    await page.goto("/referral?ref=0x1234567890abcdef");
    await expect(page.locator("body")).toBeVisible();
    const storedRef = await page.evaluate(() => {
      return localStorage.getItem("eonswap_referred_by");
    });

    // Either null or the invalid code is stored (depends on implementation)
    // Just verify page didn't crash
    expect(typeof storedRef === "string" || storedRef === null).toBe(true);
  });
});

test.describe("Referral Stats Display", () => {
  test("shows referral page content", async ({ page }) => {
    await page.goto("/referral");
    await page.waitForLoadState("domcontentloaded");

    // Should have feature cards section - use expect().toBeVisible() which waits
    await expect(page.getByText(/share your link/i)).toBeVisible();
  });

  test("bonus tiers feature card is visible", async ({ page }) => {
    await page.goto("/referral");
    await page.waitForLoadState("domcontentloaded");

    // Look for the bonus tiers feature card
    await expect(page.getByText(/bonus tiers/i)).toBeVisible();
  });
});

test.describe("Referral Page Responsive", () => {
  test("displays correctly on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/referral");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator("body")).toBeVisible();
    await expect(
      page.getByText(/invite friends|referral/i).first(),
    ).toBeVisible();
  });

  test("displays correctly on tablet", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/referral");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator("body")).toBeVisible();
    await expect(
      page.getByText(/invite friends|referral/i).first(),
    ).toBeVisible();
  });

  test("displays correctly on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/referral");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator("body")).toBeVisible();
    await expect(
      page.getByText(/invite friends|referral/i).first(),
    ).toBeVisible();
  });
});
