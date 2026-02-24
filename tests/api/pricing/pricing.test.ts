/**
 * API integration tests for GET /api/pricing
 *
 * This is a simpler endpoint — it just reads from the database and returns JSON.
 * A good test for learning how to mock a database read and verify the response shape.
 *
 * KEY CONCEPT: Testing the contract
 * The /api/pricing endpoint is a "contract" between your backend and your frontend.
 * Your frontend expects specific fields (completaPrice, extraEntreePrice, etc.) and
 * will break if those fields change names or types.
 *
 * By testing this shape explicitly, you create a safety net: if someone refactors the
 * route and renames `completaPrice` to `entreePrice`, the test will fail immediately.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/pricing/route";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    pricingConfig: {
      findFirst: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
const mockPrisma = prisma as unknown as {
  pricingConfig: { findFirst: ReturnType<typeof vi.fn> };
};

describe("GET /api/pricing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 with pricing fields as numbers", async () => {
    // Arrange: DB returns Decimal objects (Prisma converts them to string-like values)
    // We simulate this with an object that has the right structure
    mockPrisma.pricingConfig.findFirst.mockResolvedValue({
      id: "config-1",
      completaPrice: "12.00",     // Prisma Decimal serializes as string
      extraEntreePrice: "6.00",
      extraSidePrice: "2.00",
      deliveryFeePerMeal: "1.50",
      updatedAt: new Date(),
    });

    // Act
    const res = await GET();
    const body = await res.json();

    // Assert: status is 200 (implicit from no error)
    expect(res.status).toBe(200);

    // Assert: all 4 required fields are present and are numbers
    expect(typeof body.completaPrice).toBe("number");
    expect(typeof body.extraEntreePrice).toBe("number");
    expect(typeof body.extraSidePrice).toBe("number");
    expect(typeof body.deliveryFeePerMeal).toBe("number");

    // Assert: values match what the DB returned
    expect(body.completaPrice).toBe(12);
    expect(body.extraEntreePrice).toBe(6);
    expect(body.extraSidePrice).toBe(2);
    expect(body.deliveryFeePerMeal).toBe(1.5);
  });

  it("returns 404 when no pricing config exists", async () => {
    mockPrisma.pricingConfig.findFirst.mockResolvedValue(null);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toMatch(/pricing not configured/i);
  });

  it("returns 500 when database throws", async () => {
    mockPrisma.pricingConfig.findFirst.mockRejectedValue(
      new Error("Connection refused")
    );

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBeDefined();
  });
});
