import { NextRequest, NextResponse } from "next/server";
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

type OrderDayPayload = {
  dayOfWeek: number;
  completas: { entreeId: string; sides: { menuItemId: string; quantity: number }[] }[];
  extraEntrees: { menuItemId: string; quantity: number }[];
  extraSides: { menuItemId: string; quantity: number }[];
};

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { orderDays, isPickup, addressId, notes } = await request.json();

    // Validate request body
    if (!orderDays || orderDays.length === 0) {
      return NextResponse.json({ error: "Invalid order data" }, { status: 400 });
    }

    // Fetch existing order
    const order = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        customerId: true,
        weeklyMenuId: true,
        orderNumber: true
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Guard: reject if order is DELIVERED or CANCELLED
    if (order.status === "DELIVERED" || order.status === "CANCELLED") {
      return NextResponse.json(
        { error: `Cannot edit ${order.status.toLowerCase()} orders` },
        { status: 400 }
      );
    }

    const MIN_DAYS_PER_ORDER = 3;
    if (orderDays.length < MIN_DAYS_PER_ORDER) {
      return NextResponse.json(
        { error: `Minimum ${MIN_DAYS_PER_ORDER} days per order required` },
        { status: 400 }
      );
    }

    // Validate each day has at least 1 completa
    for (const day of orderDays) {
      if (!day.completas || day.completas.length === 0) {
        return NextResponse.json(
          { error: "Each day must have at least 1 completa" },
          { status: 400 }
        );
      }
    }

    // Validate delivery address
    if (!isPickup) {
      if (!addressId) {
        return NextResponse.json({ error: "Delivery address is required" }, { status: 400 });
      }
      const address = await prisma.address.findUnique({ where: { id: addressId } });
      if (!address || address.customerId !== order.customerId) {
        return NextResponse.json({ error: "Invalid delivery address" }, { status: 400 });
      }
    }

    // Validate menu items
    const typedOrderDays = orderDays as OrderDayPayload[];
    const menuItemIds: string[] = [
      ...new Set(
        typedOrderDays.flatMap((day) => [
          ...day.completas.flatMap((c) => [
            c.entreeId,
            ...c.sides.map((s) => s.menuItemId),
          ]),
          ...day.extraEntrees.map((e) => e.menuItemId),
          ...day.extraSides.map((s) => s.menuItemId),
        ])
      ),
    ];

    const menuItemCount = await prisma.menuItem.count({
      where: { id: { in: menuItemIds } },
    });
    if (menuItemCount !== menuItemIds.length) {
      return NextResponse.json({ error: "One or more menu items not found" }, { status: 400 });
    }

    // Calculate pricing
    const pricing = await getPricingConfig();
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

    // Update order in transaction (delete and recreate order items)
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // Delete existing order days (cascades to order items)
      await tx.orderDay.deleteMany({
        where: { orderId: id },
      });

      // Create new order days and items
      for (const day of typedOrderDays) {
        const orderItems: {
          menuItemId: string;
          quantity: number;
          unitPrice: number;
          isCompleta: boolean;
          completaGroupId: string | null;
        }[] = [];

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

        day.extraEntrees.forEach((extra) => {
          orderItems.push({
            menuItemId: extra.menuItemId,
            quantity: extra.quantity,
            unitPrice: pricing.extraEntreePrice,
            isCompleta: false,
            completaGroupId: null,
          });
        });

        day.extraSides.forEach((extra) => {
          orderItems.push({
            menuItemId: extra.menuItemId,
            quantity: extra.quantity,
            unitPrice: pricing.extraSidePrice,
            isCompleta: false,
            completaGroupId: null,
          });
        });

        await tx.orderDay.create({
          data: {
            orderId: id,
            dayOfWeek: day.dayOfWeek,
            orderItems: { create: orderItems },
          },
        });
      }

      // Update order with new pricing and delivery info
      return await tx.order.update({
        where: { id },
        data: {
          isPickup: !!isPickup,
          addressId: isPickup ? null : addressId,
          notes: notes || null,
          subtotal,
          deliveryFee,
          totalAmount,
        },
        include: {
          customer: {
            include: {
              user: { select: { firstName: true, lastName: true, email: true } },
            },
          },
          address: true,
          weeklyMenu: { select: { weekStartDate: true } },
          orderDays: {
            include: { orderItems: { include: { menuItem: true } } },
          },
        },
      });
    });

    // Transform response for frontend compatibility
    const response = {
      ...updatedOrder,
      customer: {
        firstName: updatedOrder.customer.user.firstName,
        lastName: updatedOrder.customer.user.lastName,
        email: updatedOrder.customer.user.email,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error updating order:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
