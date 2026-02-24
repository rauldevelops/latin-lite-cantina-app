/**
 * E2E tests for the admin orders management page.
 *
 * PLAYWRIGHT CONCEPT: USING SAVED AUTH STATE
 * Notice `test.use({ storageState: STORAGE_STATE_ADMIN })` at the top.
 * This tells Playwright: before each test in this file, restore the browser to the
 * state saved by admin.setup.ts. The browser will already have the admin's session
 * cookie — no login form interaction needed.
 *
 * This is the recommended pattern for authenticated tests in Playwright.
 *
 * PLAYWRIGHT CONCEPT: FIXTURES
 * The `page` in `test("...", async ({ page }) => {...})` is a Playwright "fixture".
 * Fixtures are objects that Playwright creates fresh for each test. Each test gets:
 *   - `page`: a clean browser page (tab)
 *   - `context`: a browser context (like an incognito window)
 *   - `browser`: the full browser instance
 *
 * You can also create custom fixtures (e.g., a pre-seeded DB state) — that's an
 * advanced topic covered in the Playwright docs.
 */

import { test, expect } from "@playwright/test";
import { STORAGE_STATE_ADMIN } from "../../helpers/auth";

// Use the saved admin session for all tests in this file
test.use({ storageState: STORAGE_STATE_ADMIN });

test.describe("Admin Orders page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/orders");
  });

  // ─── Page access ─────────────────────────────────────────────────────────
  test("admin can access the orders page", async ({ page }) => {
    // Should NOT be redirected to login
    expect(page.url()).not.toContain("/login");

    // Should see the orders page heading or content
    // (Adjust this selector to match your actual admin orders page heading)
    await expect(
      page.getByRole("heading", { name: /orders/i })
    ).toBeVisible({ timeout: 5_000 });
  });

  test("orders page shows a list or empty state", async ({ page }) => {
    // After seeding, there should be no orders yet (seed-test.ts doesn't create orders)
    // So we expect either an empty state message or a table with 0 rows
    // This test verifies the page renders without crashing
    await page.waitForLoadState("networkidle");

    // Check that the page has rendered some content (not blank)
    const body = await page.locator("main, body").first();
    await expect(body).not.toBeEmpty();
  });

  // ─── Auth guard ──────────────────────────────────────────────────────────
  test("unauthenticated user is redirected from admin pages", async ({
    browser,
  }) => {
    // Create a fresh browser context with NO saved session
    const context = await browser.newContext({ storageState: undefined });
    const page = await context.newPage();

    await page.goto("/admin/orders");

    // Should be redirected to login (or the root page)
    await page.waitForURL((url) => !url.pathname.startsWith("/admin"), {
      timeout: 5_000,
    });
    expect(page.url()).not.toContain("/admin");

    await context.close();
  });
});

test.describe("Admin Dashboard", () => {
  test.use({ storageState: STORAGE_STATE_ADMIN });

  test("admin can access the dashboard", async ({ page }) => {
    await page.goto("/admin/dashboard");
    expect(page.url()).not.toContain("/login");
    await page.waitForLoadState("networkidle");

    // Dashboard should render without crashing
    const body = await page.locator("body").first();
    await expect(body).not.toBeEmpty();
  });
});
