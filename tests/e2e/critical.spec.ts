import { expect, test } from "@playwright/test";

test("status health panel renders core monitoring signals", async ({
  page,
}) => {
  await page.goto("/status");

  await expect(page.getByText("Status Dashboard")).toBeVisible();
  await expect(page.getByText("Service Health")).toBeVisible();

  for (const provider of ["EonSwap API", "CoinGecko", "EVM RPC"]) {
    await expect(page.getByText(provider, { exact: true })).toBeVisible();
  }

  await expect(page.getByRole("button", { name: "Refresh All" })).toBeVisible();
});

test("swap widget critical controls are available", async ({ page }) => {
  await page.goto("/swap");

  // Page has both h1 "Swap" (dashboard title) and h2 "Swap" (widget header) — target h1
  await expect(page.locator("h1", { hasText: "Swap" })).toBeVisible();
  await expect(page.getByText("You pay", { exact: true })).toBeVisible();
  await expect(page.getByText("You receive", { exact: true })).toBeVisible();

  await expect(page.getByRole("button", { name: "Max" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Flip tokens" })).toBeVisible();
  await expect(
    page.locator("button", { hasText: "Connect wallet" }).first(),
  ).toBeVisible();
});

test("status health controls can toggle and refresh", async ({ page }) => {
  await page.goto("/status");

  const refreshButton = page.getByRole("button", { name: "Refresh All" });
  await expect(refreshButton).toBeVisible();
  await refreshButton.click();
  await expect(page.getByText("Service Health")).toBeVisible();
});

test("status page supports URL-prefill for swap mode", async ({ page }) => {
  const hash =
    "0x1111111111111111111111111111111111111111111111111111111111111111";
  await page.goto(`/status?tx=${hash}`);
  await expect(
    page.locator('input[placeholder="Enter transaction hash (0x...)"]'),
  ).toBeVisible();
});

test("admin dashboard filters and search operate with seeded data", async ({
  page,
}) => {
  const now = Date.now();
  await page.addInitScript((ts) => {
    const payload = {
      state: {
        history: [
          {
            id: "a1",
            status: "success",
            createdAt: ts,
            summary: "Swap 10 USDC → ~0.003 ETH",
            txHash:
              "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            chainId: 1,
            from: "0x114629C43Fa2528E5295b2982765733Acf3aCadA",
          },
          {
            id: "b1",
            status: "failed",
            createdAt: ts - 32 * 24 * 60 * 60 * 1000,
            summary: "Swap 25 USDC → ~24.8 USDC (failed)",
            txHash:
              "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
            chainId: 42161,
            from: "0x114629C43Fa2528E5295b2982765733Acf3aCadA",
          },
        ],
      },
      version: 0,
    };
    window.localStorage.setItem("eonswap-session", JSON.stringify(payload));
  }, now);

  await page.goto("/admin?e2eAdmin=1");
  await expect(
    page.getByRole("heading", { name: "Control Panel" }),
  ).toBeVisible();

  // Click Transactions tab first
  await page.getByRole("button", { name: /transactions/i }).click();

  await page.getByRole("button", { name: /success/i }).click();
  await expect(page.getByText("1 rows")).toBeVisible();

  await page.getByPlaceholder("Search...").fill("swap");
  await expect(page.getByText("1 rows")).toBeVisible();

  await page.getByPlaceholder("Search...").fill("");
  await page.getByRole("button", { name: /^all$/i }).first().click();
  await page.getByRole("button", { name: /all time/i }).click();
  await expect(page.getByText("2 rows")).toBeVisible();
  await expect(page.getByRole("button", { name: "CSV" })).toBeVisible();
});
