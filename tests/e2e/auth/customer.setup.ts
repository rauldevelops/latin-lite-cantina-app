/**
 * Customer authentication setup — same pattern as admin.setup.ts.
 * See admin.setup.ts for explanation.
 */

import { test as setup } from "@playwright/test";
import { loginAsCustomer } from "../../helpers/auth";

setup("authenticate as customer", async ({ page }) => {
  await loginAsCustomer(page);
});
