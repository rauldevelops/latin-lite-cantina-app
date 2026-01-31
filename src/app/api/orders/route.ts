import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getPricingConfig() {
  const config = await prisma.pricingConfig.findFirst();
  if (!config) throw new Error("Pricing not configured");
  return {
    completaPrice: Number(config.completaPrice),
    extraEntreePrice: Number(config.extraEntreePrice),
    extraSidePrice: Number(config.extraSidePrice),
    deliveryFeePerMeal: Number(config.deliveryFeePerMeal),
  };
}

function generateOrderNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 1000000)
    .toString()
    .padStart(6, "0");
  return `LL-${year}-${random}`;
}

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Please log in to place an order" }, { status: 401 });
    }

    const { weeklyMenuId, orderDays, isPickup, addressId } = await request.json();

    const MIN_DAYS_PER_ORDER = 3;

    if (!weeklyMenuId || !orderDays || orderDays.length === 0) {
      return NextResponse.json(
        { error: "Invalid order data" },
        { status: 400 }
      );
    }

    if (orderDays.length < MIN_DAYS_PER_ORDER) {
      return NextResponse.json(
        { error: `Minimum ${MIN_DAYS_PER_ORDER} days per order required` },
        { status: 400 }
      );
    }

    for (const day of orderDays) {
      if (!day.completas || day.completas.length === 0) {
        return NextResponse.json(
          { error: `Each day must have at least 1 completa` },
          { status: 400 }
        );
      }
    }

    // Validate delivery/pickup
    if (!isPickup) {
      if (!addressId) {
        return NextResponse.json(
          { error: "Delivery address is required" },
          { status: 400 }
        );
      }
      const address = await prisma.address.findUnique({ where: { id: addressId } });
      if (!address || address.userId !== session.user.id) {
        return NextResponse.json(
          { error: "Invalid delivery address" },
          { status: 400 }
        );
      }
    }

    // Validate the weekly menu exists and is published
    const weeklyMenu = await prisma.weeklyMenu.findUnique({
      where: { id: weeklyMenuId },
    });

    if (!weeklyMenu || !weeklyMenu.isPublished) {
      return NextResponse.json(
        { error: "Menu not available for ordering" },
        { status: 400 }
      );
    }

    type OrderDayPayload = {
      dayOfWeek: number;
      completas: { entreeId: string; sides: { menuItemId: string; quantity: number }[] }[];
      extraEntrees: { menuItemId: string; quantity: number }[];
      extraSides: { menuItemId: string; quantity: number }[];
    };

    // Collect all unique menu item IDs
    const menuItemIds: string[] = [
      ...new Set(
        (orderDays as OrderDayPayload[]).flatMap((day) => [
          ...day.completas.flatMap((c) => [
            c.entreeId,
            ...c.sides.map((s) => s.menuItemId),
          ]),
          ...day.extraEntrees.map((e) => e.menuItemId),
          ...day.extraSides.map((s) => s.menuItemId),
        ])
      ),
    ];

    // Validate all menu items exist
    const menuItemCount = await prisma.menuItem.count({
      where: { id: { in: menuItemIds } },
    });
    if (menuItemCount !== menuItemIds.length) {
      return NextResponse.json(
        { error: "One or more menu items not found" },
        { status: 400 }
      );
    }

    const pricing = await getPricingConfig();
    const typedOrderDays = orderDays as OrderDayPayload[];

    // Calculate totals
    let subtotal = 0;
    let totalMeals = 0;
    for (const day of typedOrderDays) {
      subtotal += day.completas.length * pricing.completaPrice;
      totalMeals += day.completas.length;
      for (const extra of day.extraEntrees) {
        subtotal += extra.quantity * pricing.extraEntreePrice;
        totalMeals += extra.quantity;
      }
      for (const extra of day.extraSides) {
        subtotal += extra.quantity * pricing.extraSidePrice;
      }
    }
    const deliveryFee = isPickup ? 0 : totalMeals * pricing.deliveryFeePerMeal;
    const totalAmount = subtotal + deliveryFee;

    // Create the order with nested orderDays and orderItems
    const order = await prisma.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        customerId: session.user.id,
        weeklyMenuId,
        isPickup: !!isPickup,
        addressId: isPickup ? null : addressId,
        paymentMethod: "CARD",
        paymentStatus: "PENDING",
        subtotal,
        deliveryFee,
        totalAmount,
        orderDays: {
          create: typedOrderDays.map((day) => {
            const orderItems: {
              menuItemId: string;
              quantity: number;
              unitPrice: number;
              isCompleta: boolean;
              completaGroupId: string | null;
            }[] = [];

            // Completas (unitPrice = 0 for individual items; pricing is at bundle level)
            day.completas.forEach((completa, cIndex) => {
              const groupId = `${Date.now()}-${day.dayOfWeek}-${cIndex}`;
              orderItems.push({
                menuItemId: completa.entreeId,
                quantity: 1,
                unitPrice: pricing.completaPrice,
                isCompleta: true,
                completaGroupId: groupId,
              });
              completa.sides.forEach((side) => {
                orderItems.push({
                  menuItemId: side.menuItemId,
                  quantity: side.quantity,
                  unitPrice: 0,
                  isCompleta: true,
                  completaGroupId: groupId,
                });
              });
            });

            // Extra entrees
            day.extraEntrees.forEach((extra) => {
              orderItems.push({
                menuItemId: extra.menuItemId,
                quantity: extra.quantity,
                unitPrice: pricing.extraEntreePrice,
                isCompleta: false,
                completaGroupId: null,
              });
            });

            // Extra sides
            day.extraSides.forEach((extra) => {
              orderItems.push({
                menuItemId: extra.menuItemId,
                quantity: extra.quantity,
                unitPrice: pricing.extraSidePrice,
                isCompleta: false,
                completaGroupId: null,
              });
            });

            return {
              dayOfWeek: day.dayOfWeek,
              orderItems: {
                create: orderItems,
              },
            };
          }),
        },
      },
      include: {
        orderDays: {
          include: {
            orderItems: {
              include: {
                menuItem: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error("Error creating order:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orders = await prisma.order.findMany({
      where: { customerId: session.user.id },
      include: {
        weeklyMenu: true,
        orderDays: {
          include: {
            orderItems: {
              include: {
                menuItem: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}