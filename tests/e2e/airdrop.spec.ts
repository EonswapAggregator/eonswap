import { expect, test } from "@playwright/test";

test.describe("Airdrop Page (/airdrop)", () => {
  test.beforeEach(async ({ page }) => {
    // Use domcontentloaded for faster initial load
    await page.goto("/airdrop", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    // Wait for React to hydrate
    await page
      .waitForSelector('[class*="relative"]', { timeout: 15000 })
      .catch(() => {});
  });

  test("renders without crash", async ({ page }) => {
    // Page renders with hero content - ESTF Airdrop heading in claim card
    await expect(page.getByText("ESTF Airdrop")).toBeVisible({
      timeout: 15000,
    });
  });

  test("displays hero section with badge", async ({ page }) => {
    // Official badge shown on the page
    await expect(page.getByText("Official EonSwap Airdrop")).toBeVisible();
  });

  test("displays ESTF Airdrop title", async ({ page }) => {
    await expect(page.getByText("ESTF Airdrop")).toBeVisible();
  });

  test("displays stats section", async ({ page }) => {
    await expect(page.getByText("Total Allocation")).toBeVisible();
    await expect(page.getByText("Eligible Wallets")).toBeVisible();
    // Claim Period appears in stats - use first() since it also appears in timeline
    const claimPeriodStats = page.getByText("Claim Period").first();
    await expect(claimPeriodStats).toBeVisible();
  });

  test("displays eligibility section", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Eligibility & Multipliers" }),
    ).toBeVisible();
    await expect(page.getByText("Liquidity Providers")).toBeVisible();
    await expect(page.getByText("Active Traders")).toBeVisible();
    // Community text can be part of eligibility section
    await expect(page.getByText("Community", { exact: true })).toBeVisible();
  });

  test("displays timeline section", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Timeline" })).toBeVisible();
    // Timeline shows phase titles - use exact match for clarity
    await expect(page.getByText("Snapshot", { exact: true })).toBeVisible();
    await expect(page.getByText("Eligibility Check")).toBeVisible();
    // Claim Period appears in timeline too, check it's somewhere on page
    await expect(page.getByText("Claim Period").first()).toBeVisible();
  });

  test("displays security notice", async ({ page }) => {
    // Security notice is inline text, not a heading
    await expect(page.getByText("Security:")).toBeVisible();
    await expect(page.getByText(/never share your seed phrase/i)).toBeVisible();
  });

  test("displays coming soon state", async ({ page }) => {
    // In not-deployed state, should show Coming Soon badge
    await expect(page.getByText("Coming Soon")).toBeVisible();
  });

  test("has link to Swap page", async ({ page }) => {
    const swapLink = page.getByRole("link", { name: /start trading/i });
    await expect(swapLink).toBeVisible();
    await expect(swapLink).toHaveAttribute("href", "/swap");
  });

  test("has preview mode toggle", async ({ page }) => {
    // Preview mode toggle button should be visible
    const previewBtn = page.getByRole("button", { name: /preview live mode/i });
    await expect(previewBtn).toBeVisible();
  });

  test("has external link to @EonSwap Twitter", async ({ page }) => {
    const twitterLink = page.getByRole("link", { name: "@EonSwap" });
    await expect(twitterLink).toBeVisible();
    await expect(twitterLink).toHaveAttribute("target", "_blank");
  });
});
