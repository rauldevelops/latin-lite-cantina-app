/**
 * Unit tests for src/lib/pricing.ts
 *
 * ─── WHAT IS A UNIT TEST? ────────────────────────────────────────────────────
 * A unit test focuses on ONE function in complete isolation. No database, no network,
 * no file system — just inputs in, outputs out. If the test fails, you know exactly
 * which function broke and why.
 *
 * Unit tests are the FASTEST and CHEAPEST type of test to run. A good suite of unit
 * tests can run in milliseconds and catch most logic bugs.
 *
 * ─── WHAT ARE WE TESTING? ─────────────────────────────────────────────────────
 * The `calculateOrderTotals` function — the core financial logic that determines how
 * much a customer pays. This is exactly the kind of function you want unit tests for:
 *   - It has clear inputs and outputs
 *   - Multiple edge cases (pickup vs delivery, extra items, multiple days)
 *   - If it's wrong, customers get charged the wrong amount
 *
 * ─── TEST STRUCTURE: AAA PATTERN ─────────────────────────────────────────────
 * Each test follows the Arrange–Act–Assert pattern:
 *   Arrange: set up the inputs
 *   Act:     call the function
 *   Assert:  verify the output
 */

import { describe, it, expect } from "vitest";
import { calculateOrderTotals, type PricingConfig, type OrderDayPayload } from "@/lib/pricing";

// Shared pricing config for all tests — matches what seed-test.ts creates
const PRICING: PricingConfig = {
  completaPrice: 12.0,
  extraEntreePrice: 6.0,
  extraSidePrice: 2.0,
  deliveryFeePerMeal: 1.5,
};

// A helper that creates a minimal valid order day (1 completa)
function makeDay(dayOfWeek: number, completaCount = 1): OrderDayPayload {
  return {
    dayOfWeek,
    completas: Array.from({ length: completaCount }, () => ({
      entreeId: "entree-id",
      sides: [{ menuItemId: "side-id", quantity: 1 }],
    })),
    extraEntrees: [],
    extraSides: [],
  };
}

describe("calculateOrderTotals", () => {
  // ─── Basic subtotal calculation ──────────────────────────────────────────
  it("calculates subtotal correctly for 1 completa, 1 day", () => {
    // Arrange
    const days = [makeDay(1)]; // Monday, 1 completa

    // Act
    const result = calculateOrderTotals(days, PRICING, true);

    // Assert
    // 1 completa × $12 = $12 subtotal
    expect(result.subtotal).toBe(12);
    expect(result.totalMeals).toBe(1);
  });

  it("calculates subtotal for 3 days × 1 completa each", () => {
    const days = [makeDay(1), makeDay(2), makeDay(3)];
    const result = calculateOrderTotals(days, PRICING, true);

    // 3 completas × $12 = $36
    expect(result.subtotal).toBe(36);
    expect(result.totalMeals).toBe(3);
  });

  it("calculates subtotal for multiple completas per day", () => {
    const days = [makeDay(1, 3)]; // 3 completas on Monday
    const result = calculateOrderTotals(days, PRICING, true);

    // 3 completas × $12 = $36
    expect(result.subtotal).toBe(36);
  });

  // ─── Extra items ─────────────────────────────────────────────────────────
  it("adds extra entree cost to subtotal", () => {
    const days: OrderDayPayload[] = [
      {
        dayOfWeek: 1,
        completas: [{ entreeId: "e1", sides: [] }],
        extraEntrees: [{ menuItemId: "e2", quantity: 2 }], // 2 extra entrees
        extraSides: [],
      },
    ];
    const result = calculateOrderTotals(days, PRICING, true);

    // 1 completa × $12 + 2 extra entrees × $6 = $12 + $12 = $24
    expect(result.subtotal).toBe(24);
    // Extra entrees DO count as meals for delivery fee
    expect(result.totalMeals).toBe(3);
  });

  it("adds extra side cost to subtotal", () => {
    const days: OrderDayPayload[] = [
      {
        dayOfWeek: 1,
        completas: [{ entreeId: "e1", sides: [] }],
        extraEntrees: [],
        extraSides: [{ menuItemId: "s1", quantity: 3 }], // 3 extra sides
      },
    ];
    const result = calculateOrderTotals(days, PRICING, true);

    // 1 completa × $12 + 3 extra sides × $2 = $12 + $6 = $18
    expect(result.subtotal).toBe(18);
    // Extra sides do NOT count as meals for delivery fee purposes
    expect(result.totalMeals).toBe(1);
  });

  // ─── Delivery fee ─────────────────────────────────────────────────────────
  it("charges no delivery fee for pickup orders", () => {
    const days = [makeDay(1), makeDay(2), makeDay(3)];
    const result = calculateOrderTotals(days, PRICING, true); // isPickup = true

    expect(result.deliveryFee).toBe(0);
    expect(result.totalAmount).toBe(result.subtotal);
  });

  it("charges delivery fee based on meal count for delivery orders", () => {
    const days = [makeDay(1), makeDay(2), makeDay(3)]; // 3 meals
    const result = calculateOrderTotals(days, PRICING, false); // isPickup = false

    // 3 meals × $1.50 = $4.50
    expect(result.deliveryFee).toBe(4.5);
    expect(result.totalAmount).toBe(36 + 4.5); // $40.50
  });

  it("delivery fee scales with meal count from extras", () => {
    const days: OrderDayPayload[] = [
      {
        dayOfWeek: 1,
        completas: [{ entreeId: "e1", sides: [] }],
        extraEntrees: [{ menuItemId: "e2", quantity: 1 }], // +1 meal
        extraSides: [],
      },
    ];
    const result = calculateOrderTotals(days, PRICING, false);

    // 2 meals × $1.50 = $3 delivery fee
    expect(result.deliveryFee).toBe(3);
  });

  // ─── Total amount ─────────────────────────────────────────────────────────
  it("totalAmount equals subtotal + deliveryFee", () => {
    const days = [makeDay(1), makeDay(2), makeDay(3), makeDay(4), makeDay(5)];
    const result = calculateOrderTotals(days, PRICING, false);

    expect(result.totalAmount).toBe(result.subtotal + result.deliveryFee);
  });

  // ─── Edge cases ───────────────────────────────────────────────────────────
  it("handles zero extra items gracefully", () => {
    const days: OrderDayPayload[] = [
      {
        dayOfWeek: 1,
        completas: [{ entreeId: "e1", sides: [] }],
        extraEntrees: [],
        extraSides: [],
      },
    ];
    const result = calculateOrderTotals(days, PRICING, true);

    expect(result.subtotal).toBe(12);
    expect(result.deliveryFee).toBe(0);
    expect(result.totalAmount).toBe(12);
  });

  it("handles a full 5-day week correctly", () => {
    // Typical order: 5 days × 2 completas each = 10 meals
    const days = [1, 2, 3, 4, 5].map((d) => makeDay(d, 2));
    const result = calculateOrderTotals(days, PRICING, false);

    // Subtotal: 10 completas × $12 = $120
    expect(result.subtotal).toBe(120);
    // Delivery: 10 meals × $1.50 = $15
    expect(result.deliveryFee).toBe(15);
    expect(result.totalAmount).toBe(135);
  });
});
