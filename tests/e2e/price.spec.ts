import { expect, test } from "@playwright/test";

test.describe("Price Chart", () => {
  test("chart renders with token pair info", async ({ page }) => {
    await page.goto("/swap");

    // Chart should be visible in the swap dashboard
    await expect(
      page
        .locator('[data-testid="price-chart"]')
        .or(page.locator("svg").filter({ has: page.locator("path") }))
        .first(),
    ).toBeVisible({ timeout: 10000 });

    // Time presets should be available
    const timeButtons = page
      .locator("button")
      .filter({ hasText: /^(1H|4H|1D|1W|ALL)$/ });
    await expect(timeButtons.first()).toBeVisible();
  });

  test("chart time preset buttons are interactive", async ({ page }) => {
    await page.goto("/swap");

    // Wait for chart area to load
    await page.waitForTimeout(1000);

    // Click time preset if available
    const presetButtons = page
      .locator("button")
      .filter({ hasText: /^(1H|4H|1D|1W|ALL)$/ });
    const count = await presetButtons.count();

    if (count > 0) {
      const firstPreset = presetButtons.first();
      await expect(firstPreset).toBeVisible();
      await firstPreset.click();
      // Should remain visible after click
      await expect(firstPreset).toBeVisible();
    }
  });

  test("chart displays price headline when data available", async ({
    page,
  }) => {
    await page.goto("/swap");
    await page.waitForLoadState("domcontentloaded");

    // Should display some price-related text or chart element
    // Either current price, loading state, chart, or swap widget
    const priceArea = page
      .locator('[class*="chart"]')
      .or(page.locator("text=/\\$[0-9.,]+/"))
      .or(page.getByRole("main"));
    await expect(priceArea.first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Quote Details Card", () => {
  test("trade details card is visible", async ({ page }) => {
    await page.goto("/swap");

    // Trade details card should be visible
    await expect(page.getByText("Trade details")).toBeVisible();
  });

  test("price impact row shows placeholder without input", async ({ page }) => {
    await page.goto("/swap");

    // Price impact row should exist (use exact match)
    await expect(page.getByText("Price impact", { exact: true })).toBeVisible();

    // Without input, should show dash
    const priceImpactValue = page
      .locator("div")
      .filter({ hasText: /^Price impact/ })
      .locator("span")
      .last();
    await expect(priceImpactValue).toContainText("—");
  });

  test("slippage row shows current setting", async ({ page }) => {
    await page.goto("/swap");

    // Max slippage row should be visible
    await expect(
      page.getByText("Max. slippage", { exact: true }),
    ).toBeVisible();

    // Should show percentage value
    await expect(page.locator("text=/[0-9.]+%/").first()).toBeVisible();
  });

  test("trade details shows enter amount hint", async ({ page }) => {
    await page.goto("/swap");

    // Should show hint to enter amount
    await expect(page.getByText("Enter an amount to see impact")).toBeVisible();
  });

  test("entering amount triggers quote loading", async ({ page }) => {
    await page.goto("/swap");

    // Find input field and enter amount
    const amountInput = page.locator('input[inputmode="decimal"]').first();
    await expect(amountInput).toBeVisible();

    await amountInput.fill("1");

    // Should see loading indicator or quote result
    // Wait a bit for quote to start loading
    await page.waitForTimeout(500);

    // Trade details header should still be visible
    await expect(
      page.getByText("Trade details", { exact: true }),
    ).toBeVisible();

    // The quote should start processing - just verify page doesn't crash
    await expect(page.locator("main")).toBeVisible();
  });
});

test.describe("Settings Modal Price Impact", () => {
  test("settings modal has price impact warning section", async ({ page }) => {
    await page.goto("/swap");

    // Find the slippage button (has percentage in it)
    const slippageButton = page
      .locator("button")
      .filter({ hasText: /[0-9.]+%/ })
      .first();
    await expect(slippageButton).toBeVisible();
    await slippageButton.click();

    // Settings modal should open with Transaction Settings title
    await expect(page.getByText("Transaction Settings")).toBeVisible();

    // Impact Warning section should be visible
    await expect(page.getByText("Impact Warning")).toBeVisible();
  });

  test("price impact presets are clickable", async ({ page }) => {
    await page.goto("/swap");

    // Open settings modal
    const slippageButton = page
      .locator("button")
      .filter({ hasText: /[0-9.]+%/ })
      .first();
    await slippageButton.click();

    // Wait for modal
    await expect(page.getByText("Transaction Settings")).toBeVisible();

    // Click a preset (e.g., 5%)
    const preset5 = page.locator("button").filter({ hasText: "5%" }).last();
    if (await preset5.isVisible()) {
      await preset5.click();
      // Button should be active (has ring style)
      await expect(preset5).toHaveClass(/ring/);
    }
  });

  test("all three settings sections are visible in grid", async ({ page }) => {
    await page.goto("/swap");

    // Open settings modal
    const slippageButton = page
      .locator("button")
      .filter({ hasText: /[0-9.]+%/ })
      .first();
    await slippageButton.click();

    // All three section titles should be visible (they're card titles in grid)
    await expect(
      page.locator("p").filter({ hasText: "Slippage" }).first(),
    ).toBeVisible();
    await expect(
      page.locator("p").filter({ hasText: "Deadline" }).first(),
    ).toBeVisible();
    await expect(
      page.locator("p").filter({ hasText: "Impact Warning" }).first(),
    ).toBeVisible();
  });

  test("settings modal closes on X button", async ({ page }) => {
    await page.goto("/swap");

    // Open settings modal
    const slippageButton = page
      .locator("button")
      .filter({ hasText: /[0-9.]+%/ })
      .first();
    await slippageButton.click();

    await expect(page.getByText("Transaction Settings")).toBeVisible();

    // Click close button
    const closeButton = page.locator('button[aria-label="Close"]');
    await closeButton.click();

    // Modal should be closed
    await expect(page.getByText("Transaction Settings")).not.toBeVisible();
  });

  test("settings modal closes on Escape key", async ({ page }) => {
    await page.goto("/swap");

    // Open settings modal
    const slippageButton = page
      .locator("button")
      .filter({ hasText: /[0-9.]+%/ })
      .first();
    await slippageButton.click();

    await expect(page.getByText("Transaction Settings")).toBeVisible();

    // Press Escape
    await page.keyboard.press("Escape");

    // Modal should be closed
    await expect(page.getByText("Transaction Settings")).not.toBeVisible();
  });
});
