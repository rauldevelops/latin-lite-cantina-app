/**
 * Pricing calculation utilities.
 *
 * WHY EXTRACT THIS?
 * The order total calculation originally lived inside the API route handler in
 * src/app/api/orders/route.ts. That worked, but it meant:
 *   1. You couldn't test the math without spinning up a full Next.js server
 *   2. If you ever needed to calculate totals elsewhere (e.g., client-side preview),
 *      you'd duplicate the logic
 *
 * By extracting it into a pure function (same inputs → same output, no side effects),
 * we can test it with a simple unit test and reuse it anywhere.
 *
 * This is a core principle of testable code: keep your business logic separate from
 * your framework (Next.js route handlers, React components, etc.).
 */

export type PricingConfig = {
  completaPrice: number;
  extraEntreePrice: number;
  extraSidePrice: number;
  deliveryFeePerMeal: number;
};

export type OrderDayPayload = {
  dayOfWeek: number;
  completas: {
    entreeId: string;
    sides: { menuItemId: string; quantity: number }[];
  }[];
  extraEntrees: { menuItemId: string; quantity: number }[];
  extraSides: { menuItemId: string; quantity: number }[];
};

export type OrderTotals = {
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  totalMeals: number;
};

/**
 * Calculates the order totals from order days and pricing config.
 *
 * Rules:
 *   - Each completa costs completaPrice (includes 1 entree + up to 3 sides)
 *   - Extra entrees cost extraEntreePrice each
 *   - Extra sides cost extraSidePrice each
 *   - Delivery fee = deliveryFeePerMeal × total meals (completas + extra entrees)
 *   - Pickup orders have no delivery fee
 */
export function calculateOrderTotals(
  orderDays: OrderDayPayload[],
  pricing: PricingConfig,
  isPickup: boolean
): OrderTotals {
  let subtotal = 0;
  let totalMeals = 0;

  for (const day of orderDays) {
    // Each completa = 1 "meal"
    subtotal += day.completas.length * pricing.completaPrice;
    totalMeals += day.completas.length;

    for (const extra of day.extraEntrees) {
      subtotal += extra.quantity * pricing.extraEntreePrice;
      totalMeals += extra.quantity;
    }

    for (const extra of day.extraSides) {
      subtotal += extra.quantity * pricing.extraSidePrice;
      // Note: extra sides don't count as "meals" for delivery fee purposes
    }
  }

  const deliveryFee = isPickup ? 0 : totalMeals * pricing.deliveryFeePerMeal;
  const totalAmount = subtotal + deliveryFee;

  return { subtotal, deliveryFee, totalAmount, totalMeals };
}
