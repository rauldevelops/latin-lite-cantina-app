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

    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: menuItemIds } },
    });

    const menuItemMap = new Map(menuItems.map((item) => [item.id, item]));

    // Calculate totals (pricing TBD - placeholder for now)
    const typedOrderDays = orderDays as OrderDayPayload[];
    const totalCompletas = typedOrderDays.reduce(
      (sum, day) => sum + day.completas.length, 0
    );
    const subtotal = totalCompletas * COMPLETA_PRICE;
    const deliveryFee = 0;
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
          create: typedOrderDays.map((day) => {
            const orderItems: {
              menuItemId: string;
              quantity: number;
              unitPrice: number;
              isCompleta: boolean;
              completaGroupId: string | null;
            }[] = [];

            // Completas
            day.completas.forEach((completa, cIndex) => {
              const groupId = `${Date.now()}-${day.dayOfWeek}-${cIndex}`;
              const entree = menuItemMap.get(completa.entreeId);
              orderItems.push({
                menuItemId: completa.entreeId,
                quantity: 1,
                unitPrice: Number(entree?.price || 0),
                isCompleta: true,
                completaGroupId: groupId,
              });
              completa.sides.forEach((side) => {
                const sideItem = menuItemMap.get(side.menuItemId);
                orderItems.push({
                  menuItemId: side.menuItemId,
                  quantity: side.quantity,
                  unitPrice: Number(sideItem?.price || 0),
                  isCompleta: true,
                  completaGroupId: groupId,
                });
              });
            });

            // Extra entrees
            day.extraEntrees.forEach((extra) => {
              const item = menuItemMap.get(extra.menuItemId);
              orderItems.push({
                menuItemId: extra.menuItemId,
                quantity: extra.quantity,
                unitPrice: Number(item?.price || 0),
                isCompleta: false,
                completaGroupId: null,
              });
            });

            // Extra sides
            day.extraSides.forEach((extra) => {
              const item = menuItemMap.get(extra.menuItemId);
              orderItems.push({
                menuItemId: extra.menuItemId,
                quantity: extra.quantity,
                unitPrice: Number(item?.price || 0),
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