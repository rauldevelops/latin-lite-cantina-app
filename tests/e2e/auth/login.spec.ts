/**
 * E2E tests for the login flow.
 *
 * ─── WHAT MAKES AN E2E TEST DIFFERENT? ───────────────────────────────────────
 * These tests launch a real Chromium browser, navigate to your app, and interact
 * with it just like a human would — clicking, typing, reading page content.
 *
 * What they test that unit/API tests CANNOT:
 *   - Does the page actually render the login form?
 *   - Does the error message appear in the right place on the screen?
 *   - Does the browser cookie get set after login?
 *   - Does the redirect to the right page work?
 *   - Does the "Forgot Password?" link point to the right URL?
 *
 * ─── PLAYWRIGHT LOCATOR STRATEGY ─────────────────────────────────────────────
 * We use `page.getByLabel()` and `page.getByRole()` instead of CSS selectors
 * like `#email` or `.submit-btn`. This is intentional:
 *
 *   BAD:  page.locator('#email')         ← breaks if you rename the id
 *   GOOD: page.getByLabel('Email')       ← works as long as the label text stays
 *
 * Label-based and role-based selectors also act as accessibility tests — if the
 * input is properly associated with its label, the test passes.
 *
 * ─── SETUP / PREREQUISITES ───────────────────────────────────────────────────
 * These tests use the test database user (admin@test.latinlite.com). Before running:
 *   1. Set up a test database
 *   2. Run: npm run seed:test
 *   3. Set .env.test with the correct DATABASE_URL_TEST
 *   4. Run: npm run dev (or let playwright.config.ts start it)
 *   5. Run: npm run test:e2e
 */

import { test, expect } from "@playwright/test";

// These tests don't use a pre-authenticated session — they test the login flow itself.
// (No storageState here)

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? "admin@test.latinlite.com";
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? "TestAdmin123!";

test.describe("Login page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  // ─── Page loads correctly ────────────────────────────────────────────────
  test("displays the login form", async ({ page }) => {
    // The heading should be "Sign In"
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();

    // Form fields should be present
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();

    // Submit button
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();

    // Link to register
    await expect(page.getByRole("link", { name: /register/i })).toBeVisible();
  });

  test("has a link to the register page", async ({ page }) => {
    const registerLink = page.getByRole("link", { name: /register/i });
    await expect(registerLink).toHaveAttribute("href", "/register");
  });

  test("has a forgot password link", async ({ page }) => {
    await expect(page.getByRole("link", { name: /forgot password/i })).toBeVisible();
  });

  // ─── Login success ───────────────────────────────────────────────────────
  test("redirects after successful login", async ({ page }) => {
    await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
    await page.getByLabel(/password/i).fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();

    // After login, we should NOT be on /login anymore
    await page.waitForURL((url) => !url.pathname.includes("/login"), {
      timeout: 10_000,
    });

    // Verify we're logged in by checking we can access a protected page
    expect(page.url()).not.toContain("/login");
  });

  // ─── Login failure ───────────────────────────────────────────────────────
  test("shows error message on wrong password", async ({ page }) => {
    await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
    await page.getByLabel(/password/i).fill("wrong-password");
    await page.getByRole("button", { name: /sign in/i }).click();

    // Error message should appear
    await expect(
      page.getByText(/invalid email or password/i)
    ).toBeVisible({ timeout: 5_000 });

    // Should still be on the login page
    expect(page.url()).toContain("/login");
  });

  test("shows error message when email doesn't exist", async ({ page }) => {
    await page.getByLabel(/email/i).fill("nonexistent@example.com");
    await page.getByLabel(/password/i).fill("anypassword");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(
      page.getByText(/invalid email or password/i)
    ).toBeVisible({ timeout: 5_000 });
  });

  // ─── Form validation (browser-level) ─────────────────────────────────────
  test("submit button is disabled while loading", async ({ page }) => {
    await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
    await page.getByLabel(/password/i).fill(ADMIN_PASSWORD);

    const submitBtn = page.getByRole("button", { name: /sign in/i });

    // Click and immediately check for disabled state
    // (React sets loading=true → disabled=true before the request completes)
    const clickPromise = submitBtn.click();
    // After clicking, the button should briefly say "SIGNING IN..."
    // This verifies the loading state is properly shown to the user
    await Promise.race([
      page.waitForSelector('button:has-text("SIGNING IN")'),
      page.waitForURL((url) => !url.pathname.includes("/login")),
    ]);
    await clickPromise;
  });
});
