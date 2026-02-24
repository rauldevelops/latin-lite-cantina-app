/**
 * API integration tests for POST /api/orders
 *
 * This is the most important API test in the suite. The order creation endpoint
 * has significant business logic:
 *   - Authentication handling (authenticated user vs guest checkout)
 *   - Input validation (minimum 3 days, each day needs completas, etc.)
 *   - Pricing calculation (subtotal + delivery fee)
 *   - Database writes (order, orderDays, orderItems)
 *
 * We test the validation paths extensively because they're cheap (no DB needed) and
 * protect against bad data making it into the system.
 *
 * CONCEPT: TESTING THE AUTH GUARD
 * The POST /api/orders route has two code paths:
 *   1. Authenticated user → uses session.user.customerId
 *   2. Guest checkout → requires guestInfo fields
 *
 * By mocking NextAuth's `auth()` function, we can control which path is taken
 * without needing a real session cookie.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/orders/route";

// ─── Mocks ────────────────────────────────────────────────────────────────────
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    order: { create: vi.fn() },
    address: { findUnique: vi.fn(), create: vi.fn() },
    weeklyMenu: { findUnique: vi.fn() },
    menuItem: { count: vi.fn() },
    pricingConfig: { findFirst: vi.fn() },
    customer: { findUnique: vi.fn() },
  },
}));

vi.mock("@/lib/address-validation", () => ({
  validateAddress: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateAddress } from "@/lib/address-validation";

const mockAuth = auth as ReturnType<typeof vi.fn>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockPrisma = prisma as any;
const mockValidateAddress = validateAddress as ReturnType<typeof vi.fn>;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function makeRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// Minimal valid order payload (3 days, 1 completa each, pickup)
function validPickupOrder(menuIds: {
  weeklyMenuId: string;
  entreeId: string;
  sideId: string;
}) {
  return {
    weeklyMenuId: menuIds.weeklyMenuId,
    isPickup: true,
    orderDays: [1, 2, 3].map((day) => ({
      dayOfWeek: day,
      completas: [
        {
          entreeId: menuIds.entreeId,
          sides: [{ menuItemId: menuIds.sideId, quantity: 1 }],
        },
      ],
      extraEntrees: [],
      extraSides: [],
    })),
  };
}

// Shared test IDs
const TEST_IDS = {
  weeklyMenuId: "menu-id-123",
  entreeId: "entree-id-456",
  sideId: "side-id-789",
  customerId: "customer-id-abc",
  orderId: "order-id-xyz",
};

describe("POST /api/orders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Input Validation ────────────────────────────────────────────────────
  describe("input validation", () => {
    beforeEach(() => {
      // Make the user look authenticated for these tests
      mockAuth.mockResolvedValue({
        user: { customerId: TEST_IDS.customerId },
      });
    });

    it("returns 400 when weeklyMenuId is missing", async () => {
      const res = await POST(
        makeRequest({ orderDays: [{ dayOfWeek: 1, completas: [] }], isPickup: true })
      );
      expect(res.status).toBe(400);
    });

    it("returns 400 when orderDays is empty", async () => {
      const res = await POST(
        makeRequest({ weeklyMenuId: "some-id", orderDays: [], isPickup: true })
      );
      expect(res.status).toBe(400);
    });

    it("returns 400 when fewer than 3 days are ordered", async () => {
      const res = await POST(
        makeRequest({
          weeklyMenuId: TEST_IDS.weeklyMenuId,
          isPickup: true,
          orderDays: [
            { dayOfWeek: 1, completas: [{ entreeId: "e1", sides: [] }], extraEntrees: [], extraSides: [] },
            { dayOfWeek: 2, completas: [{ entreeId: "e1", sides: [] }], extraEntrees: [], extraSides: [] },
            // Only 2 days — should fail (minimum is 3)
          ],
        })
      );
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toMatch(/minimum.*3.*days/i);
    });

    it("returns 400 when a day has no completas", async () => {
      const res = await POST(
        makeRequest({
          weeklyMenuId: TEST_IDS.weeklyMenuId,
          isPickup: true,
          orderDays: [
            { dayOfWeek: 1, completas: [], extraEntrees: [], extraSides: [] }, // no completas!
            { dayOfWeek: 2, completas: [{ entreeId: "e1", sides: [] }], extraEntrees: [], extraSides: [] },
            { dayOfWeek: 3, completas: [{ entreeId: "e1", sides: [] }], extraEntrees: [], extraSides: [] },
          ],
        })
      );
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toMatch(/at least 1 completa/i);
    });
  });

  // ─── Guest checkout validation ────────────────────────────────────────────
  describe("guest checkout", () => {
    beforeEach(() => {
      // No session = guest
      mockAuth.mockResolvedValue(null);
    });

    it("returns 400 when guest info is missing", async () => {
      const res = await POST(
        makeRequest({
          ...validPickupOrder(TEST_IDS),
          guestInfo: null, // missing
        })
      );
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toMatch(/guest information is required/i);
    });

    it("returns 400 when guest email is missing from guestInfo", async () => {
      const res = await POST(
        makeRequest({
          ...validPickupOrder(TEST_IDS),
          guestInfo: {
            // no email!
            firstName: "Guest",
            lastName: "User",
            phone: "3051234567",
          },
        })
      );
      expect(res.status).toBe(400);
    });

    it("returns 409 when guest email belongs to a registered account", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "existing-user",
        email: "registered@example.com",
        isGuest: false, // Real account!
        customer: { id: TEST_IDS.customerId },
      });

      const res = await POST(
        makeRequest({
          ...validPickupOrder(TEST_IDS),
          guestInfo: {
            email: "registered@example.com",
            firstName: "Guest",
            lastName: "User",
            phone: "3051234567",
          },
        })
      );
      const body = await res.json();

      expect(res.status).toBe(409);
      expect(body.error).toMatch(/account already exists/i);
    });
  });

  // ─── Menu validation ──────────────────────────────────────────────────────
  describe("menu validation", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({ user: { customerId: TEST_IDS.customerId } });
    });

    it("returns 400 when the weekly menu is not published", async () => {
      mockPrisma.weeklyMenu.findUnique.mockResolvedValue({
        id: TEST_IDS.weeklyMenuId,
        isPublished: false, // Not published!
      });
      mockPrisma.menuItem.count.mockResolvedValue(2); // menu items exist

      const res = await POST(makeRequest(validPickupOrder(TEST_IDS)));
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toMatch(/menu not available/i);
    });

    it("returns 400 when the weekly menu does not exist", async () => {
      mockPrisma.weeklyMenu.findUnique.mockResolvedValue(null);
      mockPrisma.menuItem.count.mockResolvedValue(2);

      const res = await POST(makeRequest(validPickupOrder(TEST_IDS)));
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toMatch(/menu not available/i);
    });
  });

  // ─── Happy path ──────────────────────────────────────────────────────────
  it("returns 201 with order data when all inputs are valid", async () => {
    // Arrange: authenticated user, valid menu, valid items
    mockAuth.mockResolvedValue({ user: { customerId: TEST_IDS.customerId } });
    mockPrisma.weeklyMenu.findUnique.mockResolvedValue({
      id: TEST_IDS.weeklyMenuId,
      isPublished: true,
    });
    mockPrisma.menuItem.count.mockResolvedValue(2); // 2 unique items (entree + side)
    mockPrisma.pricingConfig.findFirst.mockResolvedValue({
      completaPrice: "12.00",
      extraEntreePrice: "6.00",
      extraSidePrice: "2.00",
      deliveryFeePerMeal: "1.50",
    });
    mockPrisma.order.create.mockResolvedValue({
      id: TEST_IDS.orderId,
      orderNumber: "LL-2026-001234",
      customerId: TEST_IDS.customerId,
      subtotal: "36.00",
      deliveryFee: "0.00",
      totalAmount: "36.00",
      orderDays: [],
      guestToken: null,
    });

    // Act
    const res = await POST(makeRequest(validPickupOrder(TEST_IDS)));
    const body = await res.json();

    // Assert
    expect(res.status).toBe(201);
    expect(body.orderNumber).toMatch(/^LL-/);
    expect(mockPrisma.order.create).toHaveBeenCalledOnce();
  });

  it("calculates correct totals for a 3-day pickup order", async () => {
    mockAuth.mockResolvedValue({ user: { customerId: TEST_IDS.customerId } });
    mockPrisma.weeklyMenu.findUnique.mockResolvedValue({
      id: TEST_IDS.weeklyMenuId,
      isPublished: true,
    });
    mockPrisma.menuItem.count.mockResolvedValue(2);
    mockPrisma.pricingConfig.findFirst.mockResolvedValue({
      completaPrice: "12.00",
      extraEntreePrice: "6.00",
      extraSidePrice: "2.00",
      deliveryFeePerMeal: "1.50",
    });
    mockPrisma.order.create.mockResolvedValue({
      id: TEST_IDS.orderId,
      orderNumber: "LL-2026-001234",
      subtotal: "36.00",
      deliveryFee: "0.00",
      totalAmount: "36.00",
      orderDays: [],
    });

    await POST(makeRequest(validPickupOrder(TEST_IDS)));

    // Verify the totals passed to prisma.order.create are correct
    const createCall = mockPrisma.order.create.mock.calls[0][0];
    expect(createCall.data.subtotal).toBe(36); // 3 completas × $12
    expect(createCall.data.deliveryFee).toBe(0); // pickup = no fee
    expect(createCall.data.totalAmount).toBe(36);
  });
});
