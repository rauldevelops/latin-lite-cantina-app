import { loops } from "@/lib/loops";

type EventProperties = Record<string, string | number | boolean>;

/**
 * Send an event to Loops to trigger automations
 */
export async function sendLoopsEvent(
  eventName: string,
  email: string,
  eventProperties?: EventProperties
) {
  try {
    await loops.sendEvent({
      email,
      eventName,
      eventProperties,
    });
  } catch (error) {
    console.error(`Failed to send ${eventName} event to Loops:`, error);
  }
}

/**
 * Event: User created account
 * Triggers: Welcome signup series
 */
export async function sendUserCreatedEvent(email: string, firstName: string) {
  await sendLoopsEvent("user_created", email, { firstName });
}

/**
 * Event: Cart started (first item added)
 * Triggers: Abandoned cart sequence (if no order_completed follows)
 */
export async function sendCartStartedEvent(
  email: string,
  firstName: string,
  weeklyMenuId: string
) {
  await sendLoopsEvent("cart_started", email, { firstName, weeklyMenuId });
}

/**
 * Event: Order completed
 * Triggers: Order completion automation, cancels abandoned cart
 */
export async function sendOrderCompletedEvent(
  email: string,
  firstName: string,
  orderNumber: string,
  totalAmount: string,
  isPickup: boolean
) {
  await sendLoopsEvent("order_completed", email, {
    firstName,
    orderNumber,
    totalAmount,
    isPickup,
  });
}

/**
 * Event: First order completed
 * Triggers: Welcome first order series
 */
export async function sendFirstOrderEvent(
  email: string,
  firstName: string,
  orderNumber: string,
  totalAmount: string
) {
  await sendLoopsEvent("first_order", email, {
    firstName,
    orderNumber,
    totalAmount,
  });
}
