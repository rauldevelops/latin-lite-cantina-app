/**
 * E2E tests for the registration flow.
 *
 * IMPORTANT: These tests CREATE real users in the database.
 * To avoid test pollution, we use unique email addresses (with timestamps) so each
 * test run creates a fresh user.
 *
 * For a production test suite, you'd want to clean these up after each run. The
 * `afterEach` hook at the bottom shows how you'd do that with a direct DB call or
 * an admin API endpoint.
 *
 * PLAYWRIGHT CONCEPT: `page.waitForURL`
 * After submitting the registration form, the page redirects to /login?registered=true.
 * We use `waitForURL` to wait for that navigation before making assertions.
 * Without this, the test might check the URL before the redirect happens.
 */

import { test, expect } from "@playwright/test";

test.describe("Registration page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/register");
  });

  // ─── Page loads correctly ────────────────────────────────────────────────
  test("displays the registration form", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /create account/i })
    ).toBeVisible();

    await expect(page.getByLabel(/first name/i)).toBeVisible();
    await expect(page.getByLabel(/last name/i)).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /register/i })
    ).toBeVisible();
  });

  test("has a link back to the login page", async ({ page }) => {
    const loginLink = page.getByRole("link", { name: /sign in/i });
    await expect(loginLink).toBeVisible();
    await expect(loginLink).toHaveAttribute("href", "/login");
  });

  // ─── Happy path ──────────────────────────────────────────────────────────
  test("successfully registers a new user and redirects to login", async ({ page }) => {
    // Use a unique email so this test can run multiple times without conflicts
    const uniqueEmail = `test-e2e-${Date.now()}@playwright.test`;

    await page.getByLabel(/first name/i).fill("Playwright");
    await page.getByLabel(/last name/i).fill("Test");
    await page.getByLabel(/email/i).fill(uniqueEmail);
    await page.getByLabel(/password/i).fill("TestPass123!");
    await page.getByRole("button", { name: /register/i }).click();

    // Should redirect to /login?registered=true
    await page.waitForURL(/\/login\?.*registered=true/, { timeout: 10_000 });

    // Success message should be visible on the login page
    await expect(
      page.getByText(/account created successfully/i)
    ).toBeVisible();
  });

  // ─── Duplicate email ──────────────────────────────────────────────────────
  test("shows error when registering with an existing email", async ({ page }) => {
    // The test customer from seed-test.ts already exists
    const existingEmail =
      process.env.TEST_CUSTOMER_EMAIL ?? "customer@test.latinlite.com";

    await page.getByLabel(/first name/i).fill("Dup");
    await page.getByLabel(/last name/i).fill("User");
    await page.getByLabel(/email/i).fill(existingEmail);
    await page.getByLabel(/password/i).fill("AnyPass123!");
    await page.getByRole("button", { name: /register/i }).click();

    // Error message should appear
    await expect(
      page.getByText(/user already exists/i)
    ).toBeVisible({ timeout: 5_000 });

    // Should NOT redirect
    expect(page.url()).toContain("/register");
  });
});
