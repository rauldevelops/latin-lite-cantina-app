import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const COMPLETA_PRICE = 12.0;

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

    const { weeklyMenuId, orderDays } = await request.json();

    if (!weeklyMenuId || !orderDays || orderDays.length === 0) {
      return NextResponse.json(
        { error: "Invalid order data" },
        { status: 400 }
      );
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

    // Fetch menu items to get prices
    const menuItemIds = orderDays.flatMap((day: { entreeId: string; sideIds: string[] }) => [
      day.entreeId,
      ...day.sideIds,
    ]);

    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: menuItemIds } },
    });

    const menuItemMap = new Map(menuItems.map((item) => [item.id, item]));

    // Calculate totals
    const subtotal = orderDays.length * COMPLETA_PRICE;
    const deliveryFee = 0; // Can be calculated based on address later
    const totalAmount = subtotal + deliveryFee;

    // Create the order with nested orderDays and orderItems
    const order = await prisma.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        customerId: session.user.id,
        weeklyMenuId,
        subtotal,
        deliveryFee,
        totalAmount,
        orderDays: {
          create: orderDays.map((day: { dayOfWeek: number; entreeId: string; sideIds: string[] }) => {
            const completaGroupId = `${Date.now()}-${day.dayOfWeek}`;
            const entree = menuItemMap.get(day.entreeId);
            
            return {
              dayOfWeek: day.dayOfWeek,
              orderItems: {
                create: [
                  // Entree
                  {
                    menuItemId: day.entreeId,
                    quantity: 1,
                    unitPrice: entree?.price || 0,
                    isCompleta: true,
                    completaGroupId,
                  },
                  // Sides
                  ...day.sideIds.map((sideId: string) => {
                    const side = menuItemMap.get(sideId);
                    return {
                      menuItemId: sideId,
                      quantity: 1,
                      unitPrice: side?.price || 0,
                      isCompleta: true,
                      completaGroupId,
                    };
                  }),
                ],
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