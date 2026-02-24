/**
 * Playwright configuration for End-to-End (E2E) browser tests.
 *
 * WHAT IS E2E TESTING?
 * E2E tests launch a real (headless) browser, navigate to your app, click buttons,
 * fill forms, and assert what the user would actually see. They test the entire stack
 * — frontend, backend, database — all working together.
 *
 * PLAYWRIGHT VS CYPRESS:
 * Both are excellent. We chose Playwright because:
 *   - Better support for multiple tabs and iframes (needed for Stripe Elements)
 *   - Faster parallel execution
 *   - First-class TypeScript support
 *   - Official Microsoft project, actively maintained
 *
 * HOW AUTH WORKS IN PLAYWRIGHT:
 * Logging in on every single test would be slow. Instead, Playwright supports
 * "storage state" — we log in once, save the browser cookies/localStorage to a JSON
 * file, and reuse it across tests. The `auth/` setup files create those JSON files.
 */

import { defineConfig, devices } from "@playwright/test";
import path from "path";
import dotenv from "dotenv";

// Load test environment variables so DATABASE_URL_TEST is available below.
// .env.test.local overrides .env.test (same pattern as Next.js env loading).
dotenv.config({ path: ".env.test.local" });
dotenv.config({ path: ".env.test" });

// Storage state files (saved login sessions)
// These are gitignored — they contain session cookies, not passwords
export const STORAGE_STATE_ADMIN = path.join(
  __dirname,
  "playwright/.auth/admin.json"
);
export const STORAGE_STATE_CUSTOMER = path.join(
  __dirname,
  "playwright/.auth/customer.json"
);

export default defineConfig({
  // Where Playwright looks for test files
  testDir: "./tests/e2e",

  // Run tests in parallel (each test file gets its own worker)
  fullyParallel: true,

  // Fail the build in CI if you accidentally left a test.only()
  forbidOnly: !!process.env.CI,

  // Retry failed tests once in CI (flakiness buffer)
  retries: process.env.CI ? 1 : 0,

  // Number of parallel workers
  workers: process.env.CI ? 1 : undefined,

  // Test report format — use "html" for a browseable report
  reporter: [["html", { open: "never" }], ["list"]],

  use: {
    // All tests hit localhost:3000 — run `npm run dev` before `npm run test:e2e`
    baseURL: "http://localhost:3000",

    // Capture a screenshot on failure (helpful for debugging)
    screenshot: "only-on-failure",

    // Record a video on the first retry (helps diagnose flaky tests)
    video: "on-first-retry",

    // Playwright traces let you step through test execution after the fact
    trace: "on-first-retry",
  },

  projects: [
    // ─── Setup projects (run before test projects) ──────────────────────────
    // These create the saved session files for admin and customer users.
    {
      name: "setup-admin",
      testMatch: "**/auth/admin.setup.ts",
    },
    {
      name: "setup-customer",
      testMatch: "**/auth/customer.setup.ts",
    },

    // ─── Test projects ───────────────────────────────────────────────────────
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      // Admin tests depend on the admin session being set up first
      dependencies: ["setup-admin", "setup-customer"],
    },

    // Uncomment to run mobile tests as well:
    // {
    //   name: "Mobile Safari",
    //   use: { ...devices["iPhone 14"] },
    //   dependencies: ["setup-admin", "setup-customer"],
    // },
  ],

  // Automatically start/stop the Next.js dev server for tests
  // Remove this if you prefer to run `npm run dev` manually.
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    // In CI, always start a fresh server. Locally, reuse if one is already
    // running — but NOTE: if you have a dev server running that points to the
    // staging DB, stop it first so Playwright starts one with the test DB.
    reuseExistingServer: !process.env.CI,
    timeout: 60 * 1000,
    // Override DATABASE_URL so the dev server queries the test database,
    // not the staging one. Next.js respects env vars set before it starts.
    env: {
      DATABASE_URL: process.env.DATABASE_URL_TEST ?? "",
    },
  },
});
