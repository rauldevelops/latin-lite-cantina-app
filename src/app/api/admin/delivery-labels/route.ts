import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DAY_NAMES: Record<number, string> = {
  1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri",
};

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const weeklyMenuId = request.nextUrl.searchParams.get("weeklyMenuId");
    const dayOfWeek = request.nextUrl.searchParams.get("dayOfWeek");
    const driverId = request.nextUrl.searchParams.get("driverId");

    if (!weeklyMenuId || !dayOfWeek) {
      return NextResponse.json({ error: "weeklyMenuId and dayOfWeek are required" }, { status: 400 });
    }

    const dayNum = parseInt(dayOfWeek, 10);

    const weeklyMenu = await prisma.weeklyMenu.findUnique({
      where: { id: weeklyMenuId },
      select: { weekStartDate: true },
    });

    if (!weeklyMenu) {
      return NextResponse.json({ error: "Weekly menu not found" }, { status: 404 });
    }

    // Fetch all non-cancelled, non-pickup orders for this week that have an orderDay for this day
    const orders = await prisma.order.findMany({
      where: {
        weeklyMenuId,
        status: { not: "CANCELLED" },
        isPickup: false,
        addressId: { not: null },
        orderDays: { some: { dayOfWeek: dayNum } },
        ...(driverId ? { address: { driverId } } : {}),
      },
      include: {
        customer: {
          include: {
            user: { select: { firstName: true, lastName: true, phone: true } },
          },
        },
        address: {
          include: { driver: { select: { id: true, name: true } } },
        },
        orderDays: {
          where: { dayOfWeek: dayNum },
          include: {
            orderItems: {
              include: { menuItem: { select: { name: true, type: true, isDessert: true } } },
              orderBy: { menuItem: { type: "asc" } },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Count total orders per customer for "Order X of Y"
    const customerOrderCounts: Record<string, number> = {};
    const customerOrderIndex: Record<string, number> = {};
    for (const order of orders) {
      const cid = order.customerId;
      customerOrderCounts[cid] = (customerOrderCounts[cid] || 0) + 1;
    }
    for (const cid of Object.keys(customerOrderCounts)) {
      customerOrderIndex[cid] = 0;
    }

    const labels = [];

    for (const order of orders) {
      const orderDay = order.orderDays[0];
      if (!orderDay) continue;

      const cid = order.customerId;
      customerOrderIndex[cid] = (customerOrderIndex[cid] || 0) + 1;

      // Group items by completaGroupId
      const completaGroups: Record<string, typeof orderDay.orderItems> = {};
      const extras: typeof orderDay.orderItems = [];

      for (const item of orderDay.orderItems) {
        if (item.isCompleta && item.completaGroupId) {
          if (!completaGroups[item.completaGroupId]) {
            completaGroups[item.completaGroupId] = [];
          }
          completaGroups[item.completaGroupId].push(item);
        } else {
          extras.push(item);
        }
      }

      // Separate extras into entrees and sides
      const extraEntrees = extras.filter((i) => i.menuItem.type === "ENTREE");
      const extraSides = extras.filter((i) => i.menuItem.type === "SIDE");

      // Create one label per completa group (each bag)
      const completaGroupIds = Object.keys(completaGroups);
      // Only count completa bags; extras will be distributed across them
      const totalBags = completaGroupIds.length > 0 ? completaGroupIds.length : (extras.length > 0 ? 1 : 0);
      let bagIndex = 0;

      for (const groupId of completaGroupIds) {
        bagIndex++;
        const items = completaGroups[groupId];
        const entree = items.find((i) => i.menuItem.type === "ENTREE");
        const sides = items.filter((i) => i.menuItem.type === "SIDE");

        // Distribute extras across completa labels (put all on first label for simplicity)
        const labelExtras = bagIndex === 1
          ? { extraEntrees: extraEntrees.map((i) => i.menuItem.name), extraSides: extraSides.map((i) => i.menuItem.name) }
          : { extraEntrees: [] as string[], extraSides: [] as string[] };

        labels.push({
          orderNumber: order.orderNumber,
          customerFirstName: order.customer.user.firstName,
          customerLastName: order.customer.user.lastName,
          phone: order.customer.user.phone,
          addressId: order.addressId,
          address: order.address
            ? {
                street: order.address.street,
                unit: order.address.unit,
                city: order.address.city,
                state: order.address.state,
                zipCode: order.address.zipCode,
                deliveryNotes: order.address.deliveryNotes,
              }
            : null,
          driverId: order.address?.driver?.id || null,
          driverName: order.address?.driver?.name || null,
          stopNumber: order.address?.stopNumber || null,
          weekStartDate: weeklyMenu.weekStartDate.toISOString().split("T")[0],
          dayOfWeek: dayNum,
          dayLabel: `${dayNum}-${DAY_NAMES[dayNum] || dayNum}`,
          bagIndex,
          totalBags,
          orderIndex: customerOrderIndex[cid],
          orderTotal: customerOrderCounts[cid],
          entree: entree?.menuItem.name || null,
          sides: sides.map((s) => s.menuItem.name),
          ...labelExtras,
          balanceDue: bagIndex === 1 ? Number(order.totalAmount) : 0,
          enteredDate: order.createdAt.toISOString().split("T")[0],
        });
      }

      // Only create a separate extras label if there are NO completas for this day
      if (completaGroupIds.length === 0 && extras.length > 0) {
        bagIndex++;
        labels.push({
          orderNumber: order.orderNumber,
          customerFirstName: order.customer.user.firstName,
          customerLastName: order.customer.user.lastName,
          phone: order.customer.user.phone,
          addressId: order.addressId,
          address: order.address
            ? {
                street: order.address.street,
                unit: order.address.unit,
                city: order.address.city,
                state: order.address.state,
                zipCode: order.address.zipCode,
                deliveryNotes: order.address.deliveryNotes,
              }
            : null,
          driverId: order.address?.driver?.id || null,
          driverName: order.address?.driver?.name || null,
          stopNumber: order.address?.stopNumber || null,
          weekStartDate: weeklyMenu.weekStartDate.toISOString().split("T")[0],
          dayOfWeek: dayNum,
          dayLabel: `${dayNum}-${DAY_NAMES[dayNum] || dayNum}`,
          bagIndex,
          totalBags,
          orderIndex: customerOrderIndex[cid],
          orderTotal: customerOrderCounts[cid],
          entree: null,
          sides: [],
          extraEntrees: extraEntrees.map((i) => i.menuItem.name),
          extraSides: extraSides.map((i) => i.menuItem.name),
          balanceDue: Number(order.totalAmount),
          enteredDate: order.createdAt.toISOString().split("T")[0],
        });
      }
    }

    // Sort by stopNumber (nulls last), then by address street
    labels.sort((a, b) => {
      if (a.stopNumber == null && b.stopNumber == null) return (a.address?.street || "").localeCompare(b.address?.street || "");
      if (a.stopNumber == null) return -1;
      if (b.stopNumber == null) return 1;
      return a.stopNumber - b.stopNumber;
    });

    return NextResponse.json(labels);
  } catch (error) {
    console.error("Error fetching delivery labels:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
