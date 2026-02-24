/**
 * Admin authentication setup.
 *
 * This is a Playwright "setup project" — it runs BEFORE any test project that
 * lists it as a dependency. It logs in once as admin and saves the session.
 *
 * WHY DOES THIS EXIST?
 * Playwright runs test files in parallel across multiple workers. If each admin
 * test file logged in separately, they'd each spend 3-5 seconds on the login flow.
 * With this setup file, login happens once and the saved session is shared.
 *
 * The saved file (playwright/.auth/admin.json) contains the browser's cookies.
 * NextAuth stores the JWT session in a cookie, so loading that file means the
 * browser is immediately authenticated.
 *
 * HOW TO TRIGGER: this file is matched by the setup-admin project in playwright.config.ts
 * and runs before the chromium project.
 */

import { test as setup } from "@playwright/test";
import { loginAsAdmin } from "../../helpers/auth";

setup("authenticate as admin", async ({ page }) => {
  await loginAsAdmin(page);
});
