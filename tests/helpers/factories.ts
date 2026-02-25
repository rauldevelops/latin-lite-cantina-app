/**
 * Test data factories.
 *
 * CONCEPT: FACTORIES VS FIXTURES
 * In testing, a "factory" is a function that produces a valid piece of test data.
 * This solves a common problem: your API has 10 required fields, but your test only
 * cares about 1. A factory provides sensible defaults for everything else.
 *
 * EXAMPLE:
 *   const body = makeOrderBody({ isPickup: true });
 *   // Returns a full valid order payload with isPickup overridden to true
 *
 * This makes tests READABLE — they show only what matters for that specific test.
 */

/** A valid 3-day order body (the minimum the API accepts) */
export function makeOrderBody(
  overrides: Partial<{ weeklyMenuId: string; isPickup: boolean; orderDays: unknown[] }> = {},
  menuIds: { weeklyMenuId: string; entreeId: string; sideId: string }
) {
  return {
    weeklyMenuId: menuIds.weeklyMenuId,
    isPickup: true,
    orderDays: [
      {
        dayOfWeek: 1,
        completas: [
          {
            entreeId: menuIds.entreeId,
            sides: [{ menuItemId: menuIds.sideId, quantity: 1 }],
          },
        ],
        extraEntrees: [],
        extraSides: [],
      },
      {
        dayOfWeek: 2,
        completas: [
          {
            entreeId: menuIds.entreeId,
            sides: [{ menuItemId: menuIds.sideId, quantity: 1 }],
          },
        ],
        extraEntrees: [],
        extraSides: [],
      },
      {
        dayOfWeek: 3,
        completas: [
          {
            entreeId: menuIds.entreeId,
            sides: [{ menuItemId: menuIds.sideId, quantity: 1 }],
          },
        ],
        extraEntrees: [],
        extraSides: [],
      },
    ],
    ...overrides,
  };
}

/** Valid registration payload */
export function makeRegisterBody(overrides: Record<string, string> = {}) {
  return {
    email: `test-${Date.now()}@example.com`,
    password: "TestPass123!",
    firstName: "Test",
    lastName: "User",
    ...overrides,
  };
}
