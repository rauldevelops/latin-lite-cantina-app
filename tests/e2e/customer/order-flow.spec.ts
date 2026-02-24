/**
 * E2E tests for the customer order flow — the most critical user journey.
 *
 * THE CRITICAL PATH:
 * Customer can see the menu → navigate to order page → (logged in) → checkout
 *
 * We test two scenarios:
 *   1. Logged-in customer visiting the order page
 *   2. Unauthenticated visitor viewing the public menu
 *
 * PLAYWRIGHT CONCEPT: NETWORK INTERCEPTION with page.route()
 * The order page makes API calls to fetch menus, pricing, etc. We can intercept
 * these calls and return mock data to:
 *   - Speed up tests (no real DB round-trip)
 *   - Test loading states and error states
 *   - Test what happens with specific data shapes
 *
 * This is the Playwright equivalent of `vi.mock()` in Vitest — same idea,
 * different layer.
 *
 * WHEN TO USE REAL DATA VS MOCKED DATA:
 *   - Use REAL data when testing that the full stack works together
 *   - Use MOCKED data when testing UI behavior for specific data shapes
 *     (e.g., "what does the page look like when there are no menus?")
 */

import { test, expect } from "@playwright/test";
import { STORAGE_STATE_CUSTOMER } from "../../helpers/auth";

test.describe("Public menu page (unauthenticated)", () => {
  test("menu page is accessible without login", async ({ page }) => {
    const response = await page.goto("/menu");

    // The menu page should return 200, not redirect to login
    expect(response?.status()).toBe(200);
    expect(page.url()).not.toContain("/login");
  });

  test("menu page renders content without crashing", async ({ page }) => {
    await page.goto("/menu");
    await page.waitForLoadState("networkidle");

    // Check the page isn't blank
    const body = page.locator("body");
    await expect(body).not.toBeEmpty();
  });
});

test.describe("Order page (authenticated customer)", () => {
  test.use({ storageState: STORAGE_STATE_CUSTOMER });

  test("authenticated customer can reach the order page", async ({ page }) => {
    const response = await page.goto("/order");
    expect(response?.status()).toBe(200);
    expect(page.url()).not.toContain("/login");
  });

  test("order page shows loading or content (not blank)", async ({ page }) => {
    await page.goto("/order");
    await page.waitForLoadState("networkidle");

    const body = page.locator("body");
    await expect(body).not.toBeEmpty();
  });
});

test.describe("Order page (unauthenticated)", () => {
  test("unauthenticated user can access the order page (guest checkout supported)", async ({
    page,
  }) => {
    // The order page supports guest checkout, so it should NOT redirect to login
    const response = await page.goto("/order");
    expect(response?.status()).toBe(200);
  });
});

test.describe("Customer account page", () => {
  test.use({ storageState: STORAGE_STATE_CUSTOMER });

  test("authenticated customer can access account page", async ({ page }) => {
    await page.goto("/account");
    await page.waitForLoadState("networkidle");

    expect(page.url()).not.toContain("/login");
  });

  test("unauthenticated user is redirected from account page", async ({
    browser,
  }) => {
    const context = await browser.newContext({ storageState: undefined });
    const page = await context.newPage();

    await page.goto("/account");

    // Should redirect to login
    await page.waitForURL((url) => url.pathname.includes("/login"), {
      timeout: 5_000,
    });

    await context.close();
  });
});
