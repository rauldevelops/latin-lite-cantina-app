import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { sendOrderConfirmationEmail } from "@/lib/emails/order-confirmation";

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

type OrderDayPayload = {
  dayOfWeek: number;
  completas: { entreeId: string; sides: { menuItemId: string; quantity: number }[] }[];
  extraEntrees: { menuItemId: string; quantity: number }[];
  extraSides: { menuItemId: string; quantity: number }[];
};

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const where: Prisma.OrderWhereInput = {};

    if (status) {
      where.status = status as Prisma.EnumOrderStatusFilter;
    }

    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: "insensitive" } },
        { customer: { user: { firstName: { contains: search, mode: "insensitive" } } } },
        { customer: { user: { lastName: { contains: search, mode: "insensitive" } } } },
        { customer: { user: { email: { contains: search, mode: "insensitive" } } } },
      ];
    }

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = toDate;
      }
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        customer: {
          include: {
            user: {
              select: { firstName: true, lastName: true, email: true },
            },
          },
        },
        address: true,
        weeklyMenu: { select: { weekStartDate: true } },
        _count: { select: { orderDays: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Transform to flatten customer.user for frontend compatibility
    const result = orders.map((order) => ({
      ...order,
      customer: {
        firstName: order.customer.user.firstName,
        lastName: order.customer.user.lastName,
        email: order.customer.user.email,
      },
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      customerId,
      weeklyMenuId,
      orderDays,
      isPickup,
      addressId,
      paymentMethod,
      paymentStatus,
      notes,
    } = await request.json();

    if (!customerId || !weeklyMenuId || !orderDays || orderDays.length === 0) {
      return NextResponse.json({ error: "Invalid order data" }, { status: 400 });
    }

    const MIN_DAYS_PER_ORDER = 3;
    if (orderDays.length < MIN_DAYS_PER_ORDER) {
      return NextResponse.json(
        { error: `Minimum ${MIN_DAYS_PER_ORDER} days per order required` },
        { status: 400 }
      );
    }

    for (const day of orderDays) {
      if (!day.completas || day.completas.length === 0) {
        return NextResponse.json(
          { error: "Each day must have at least 1 completa" },
          { status: 400 }
        );
      }
    }

    // Validate customer - customerId is now Customer.id
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 400 });
    }

    // Validate delivery address
    if (!isPickup) {
      if (!addressId) {
        return NextResponse.json({ error: "Delivery address is required" }, { status: 400 });
      }
      const address = await prisma.address.findUnique({ where: { id: addressId } });
      if (!address || address.customerId !== customerId) {
        return NextResponse.json({ error: "Invalid delivery address" }, { status: 400 });
      }
    }

    // Validate weekly menu
    const weeklyMenu = await prisma.weeklyMenu.findUnique({ where: { id: weeklyMenuId } });
    if (!weeklyMenu || !weeklyMenu.isPublished) {
      return NextResponse.json({ error: "Menu not available for ordering" }, { status: 400 });
    }

    // Validate payment method
    const validMethods = ["CARD", "CASH", "CHECK", "CREDIT_ACCOUNT"];
    if (!paymentMethod || !validMethods.includes(paymentMethod)) {
      return NextResponse.json({ error: "Invalid payment method" }, { status: 400 });
    }

    const validStatuses = ["PENDING", "PAID", "CREDIT_ACCOUNT"];
    if (!paymentStatus || !validStatuses.includes(paymentStatus)) {
      return NextResponse.json({ error: "Invalid payment status" }, { status: 400 });
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

    // Create order
    const order = await prisma.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        customerId,
        weeklyMenuId,
        isPickup: !!isPickup,
        addressId: isPickup ? null : addressId,
        paymentMethod,
        paymentStatus,
        subtotal,
        deliveryFee,
        totalAmount,
        notes: notes || null,
        createdById: session.user.id,
        orderDays: {
          create: typedOrderDays.map((day) => {
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

            return {
              dayOfWeek: day.dayOfWeek,
              orderItems: { create: orderItems },
            };
          }),
        },
      },
      include: {
        customer: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
        orderDays: {
          include: { orderItems: { include: { menuItem: true } } },
        },
      },
    });

    // Send confirmation email for PAID or CREDIT_ACCOUNT orders
    if (paymentStatus === "PAID" || paymentStatus === "CREDIT_ACCOUNT") {
      const emailResult = await sendOrderConfirmationEmail(order.id);
      if (emailResult.success) {
        console.log(`Order confirmation email sent for ${order.orderNumber}`);
      } else {
        console.error(`Failed to send confirmation email for ${order.orderNumber}:`, emailResult.error);
      }
    }

    // Transform response for frontend
    const response = {
      ...order,
      customer: {
        firstName: order.customer.user.firstName,
        lastName: order.customer.user.lastName,
      },
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("Error creating admin order:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
