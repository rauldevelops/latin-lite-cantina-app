/**
 * Vitest global setup file.
 *
 * This runs ONCE before any test suite. Think of it as the "before everything" hook.
 *
 * WHY DO WE NEED THIS?
 * Our API route handlers import from "@/lib/prisma", which reads DATABASE_URL at
 * import time. If DATABASE_URL_TEST is set, we redirect all Prisma calls to the
 * test database instead of your dev/staging database.
 *
 * For tests that mock Prisma entirely (most API tests), this just ensures clean env.
 *
 * IMPORTANT: For now our API tests mock Prisma with vi.mock(), so they don't need a
 * real test database. If you add integration tests that talk to a real DB, set
 * DATABASE_URL_TEST in .env.test to a separate Neon branch or local Postgres.
 */

import { vi } from "vitest";

// If DATABASE_URL_TEST is set, override DATABASE_URL so all Prisma calls go to the
// test database. This is the safest pattern — you never accidentally write to prod.
if (process.env.DATABASE_URL_TEST) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
}

// Silence console.log in tests to keep output clean.
// Comment this out if you're debugging and need to see logs.
vi.spyOn(console, "log").mockImplementation(() => {});
