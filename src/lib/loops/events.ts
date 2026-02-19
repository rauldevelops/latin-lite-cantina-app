import { loops } from "@/lib/loops";

type EventProperties = Record<string, string | number | boolean>;

const getMenuUrl = () => {
  // Use VERCEL_URL for automatic environment-specific URLs
  // VERCEL_URL is automatically set by Vercel for each deployment
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
                  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://latinlitecantina.com");
  return `${baseUrl}/order`;
};

const getEnvironment = () =>
  process.env.NEXT_PUBLIC_APP_ENV === "production" ? "production" : "staging";

/**
 * Send an event to Loops to trigger automations
 */
export async function sendLoopsEvent(
  eventName: string,
  email: string,
  eventProperties?: EventProperties
) {
  console.log(`[Loops] Sending event "${eventName}" to ${email}`, eventProperties);

  if (!process.env.LOOPS_API_KEY) {
    console.error(`[Loops] LOOPS_API_KEY is not set, cannot send ${eventName} event`);
    return;
  }

  try {
    const result = await loops.sendEvent({
      email,
      eventName,
      eventProperties: { ...eventProperties, environment: getEnvironment() },
    });
    console.log(`[Loops] Event "${eventName}" sent successfully:`, result);
  } catch (error) {
    console.error(`[Loops] Failed to send ${eventName} event:`, error);
    throw error;
  }
}

/**
 * Event: User created account
 * Triggers: Welcome signup series
 */
export async function sendUserCreatedEvent(email: string, firstName: string) {
  await sendLoopsEvent("user_created", email, { firstName, menuUrl: getMenuUrl() });
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
  await sendLoopsEvent("cart_started", email, {
    firstName,
    weeklyMenuId,
    menuUrl: getMenuUrl(),
  });
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
    menuUrl: getMenuUrl(),
  });
}
