import { prisma } from "@/lib/prisma";
import { loops } from "@/lib/loops";

/**
 * Sync a single user's contact data to Loops
 */
export async function syncContactToLoops(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      customer: {
        include: {
          orders: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  if (!user?.email) return;

  const orderCount = user.orderCount;
  const lastOrder = user.customer?.orders[0];

  // Determine preferred method from order history
  let preferredMethod = user.preferredMethod;
  if (!preferredMethod && user.customer?.orders.length) {
    const orders = await prisma.order.findMany({
      where: { customerId: user.customer.id },
      select: { isPickup: true },
    });
    const pickupCount = orders.filter((o) => o.isPickup).length;
    const deliveryCount = orders.length - pickupCount;
    preferredMethod = pickupCount > deliveryCount ? "pickup" : "delivery";
  }

  try {
    await loops.updateContact({
      email: user.email,
      userId: user.id,
      properties: {
        firstName: user.firstName,
        lastName: user.lastName,
        orderCount,
        lastOrderDate: lastOrder?.createdAt?.toISOString() ?? null,
        preferredMethod: preferredMethod ?? null,
        createdAt: user.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error(`Failed to sync contact ${user.email} to Loops:`, error);
  }
}

/**
 * Sync all users to Loops (for initial migration)
 */
export async function syncAllContactsToLoops() {
  const users = await prisma.user.findMany({
    where: { email: { not: null } },
    select: { id: true },
  });

  let synced = 0;
  let failed = 0;

  for (const user of users) {
    try {
      await syncContactToLoops(user.id);
      synced++;
      // Rate limiting: 100ms delay between requests
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Failed to sync user ${user.id}:`, error);
      failed++;
    }
  }

  return { synced, failed, total: users.length };
}
