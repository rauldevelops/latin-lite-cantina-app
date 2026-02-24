/**
 * Authentication helpers for Playwright E2E tests.
 *
 * CONCEPT: SAVED SESSION STATE
 * Logging in through the UI on every single test is wasteful and slow.
 * A login UI test takes ~3-5 seconds. If you have 50 tests, that's 2.5 minutes just
 * logging in.
 *
 * Playwright's solution: save the browser's cookies and localStorage after login,
 * then reload that snapshot at the start of each test. The test starts already
 * authenticated — no login flow needed.
 *
 * These saved files live in playwright/.auth/ and are gitignored (they contain
 * session tokens, not passwords).
 *
 * HOW TO USE:
 * In a test file:
 *   test.use({ storageState: STORAGE_STATE_ADMIN });
 *   // All tests in this file start already logged in as admin
 */

import { type Page } from "@playwright/test";
import { STORAGE_STATE_ADMIN, STORAGE_STATE_CUSTOMER } from "../../playwright.config";

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? "admin@test.latinlite.com";
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? "TestAdmin123!";
const CUSTOMER_EMAIL = process.env.TEST_CUSTOMER_EMAIL ?? "customer@test.latinlite.com";
const CUSTOMER_PASSWORD = process.env.TEST_CUSTOMER_PASSWORD ?? "TestCustomer123!";

/**
 * Logs in as the admin user and saves the session state.
 * Called from tests/e2e/auth/admin.setup.ts — runs once before all admin tests.
 */
export async function loginAsAdmin(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
  await page.getByLabel(/password/i).fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: /sign in|log in/i }).click();

  // Wait for redirect to confirm login succeeded
  await page.waitForURL((url) => !url.pathname.includes("/login"), {
    timeout: 10_000,
  });

  // Save the session cookies to disk
  await page.context().storageState({ path: STORAGE_STATE_ADMIN });
}

/**
 * Logs in as the test customer and saves the session state.
 * Called from tests/e2e/auth/customer.setup.ts — runs once before all customer tests.
 */
export async function loginAsCustomer(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(CUSTOMER_EMAIL);
  await page.getByLabel(/password/i).fill(CUSTOMER_PASSWORD);
  await page.getByRole("button", { name: /sign in|log in/i }).click();

  await page.waitForURL((url) => !url.pathname.includes("/login"), {
    timeout: 10_000,
  });

  await page.context().storageState({ path: STORAGE_STATE_CUSTOMER });
}

export { STORAGE_STATE_ADMIN, STORAGE_STATE_CUSTOMER };
