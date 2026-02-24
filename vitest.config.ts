/**
 * Vitest configuration for unit and API integration tests.
 *
 * WHAT IS VITEST?
 * Vitest is a fast, modern test runner built on Vite. It understands TypeScript
 * natively, supports the same `import` syntax your app uses, and runs tests much
 * faster than Jest for most projects.
 *
 * TWO TYPES OF TESTS LIVE HERE:
 *   tests/unit/    → pure functions, no database, no network
 *   tests/api/     → API route handlers called directly (no browser, no HTTP)
 */

import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    // This plugin reads tsconfig.json and maps @/* paths to ./src/*
    // Without this, `import { prisma } from "@/lib/prisma"` would fail in tests.
    tsconfigPaths(),
  ],
  test: {
    // "node" environment means tests run in Node.js, not a browser emulator.
    // This is correct for testing API route handlers and pure functions.
    environment: "node",

    // Makes describe(), it(), expect(), vi() available globally without imports.
    // Equivalent to Jest's default behavior.
    globals: true,

    // Run this file before any test suite to set up environment variables.
    setupFiles: ["tests/setup.ts"],

    // Only run unit and API tests — Playwright handles tests/e2e/ separately.
    // Without this, Vitest would try to run Playwright .spec.ts files as regular
    // Node tests, which fails because they use Playwright-specific APIs.
    include: ["tests/unit/**/*.test.ts", "tests/api/**/*.test.ts"],

    // Code coverage settings — run with `npm run test:coverage`
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      // What source files to measure coverage on
      include: ["src/lib/**/*.ts", "src/app/api/**/*.ts"],
      // Exclude generated/compiled files
      exclude: ["src/lib/prisma.ts", "**/*.d.ts"],
    },
  },
});
