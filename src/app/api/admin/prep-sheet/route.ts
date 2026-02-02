import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DAY_NAMES = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const weeklyMenuId = searchParams.get("weeklyMenuId");
    const dayOfWeek = searchParams.get("dayOfWeek");

    if (!weeklyMenuId || !dayOfWeek) {
      return NextResponse.json(
        { error: "weeklyMenuId and dayOfWeek are required" },
        { status: 400 }
      );
    }

    const dayNum = parseInt(dayOfWeek, 10);

    const weeklyMenu = await prisma.weeklyMenu.findUnique({
      where: { id: weeklyMenuId },
      select: { weekStartDate: true },
    });

    if (!weeklyMenu) {
      return NextResponse.json({ error: "Weekly menu not found" }, { status: 404 });
    }

    // Find all non-cancelled orders for this weekly menu
    const orders = await prisma.order.findMany({
      where: {
        weeklyMenuId,
        status: { not: "CANCELLED" },
      },
      select: {
        id: true,
        orderDays: {
          where: { dayOfWeek: dayNum },
          select: {
            orderItems: {
              select: {
                menuItemId: true,
                quantity: true,
                isCompleta: true,
                menuItem: {
                  select: { name: true, type: true, isDessert: true },
                },
              },
            },
          },
        },
      },
    });

    // Aggregate items
    const itemMap: Record<
      string,
      {
        menuItemId: string;
        name: string;
        type: string;
        isDessert: boolean;
        completaQty: number;
        extraQty: number;
      }
    > = {};

    let totalOrders = 0;
    let totalCompletas = 0;

    for (const order of orders) {
      if (order.orderDays.length === 0) continue;
      totalOrders++;

      for (const day of order.orderDays) {
        // Count unique completa groups via completa entrees
        const completaEntrees = day.orderItems.filter(
          (item) => item.isCompleta && item.menuItem.type === "ENTREE"
        );
        totalCompletas += completaEntrees.length;

        for (const item of day.orderItems) {
          if (!itemMap[item.menuItemId]) {
            itemMap[item.menuItemId] = {
              menuItemId: item.menuItemId,
              name: item.menuItem.name,
              type: item.menuItem.type,
              isDessert: item.menuItem.isDessert,
              completaQty: 0,
              extraQty: 0,
            };
          }

          if (item.isCompleta) {
            itemMap[item.menuItemId].completaQty += item.quantity;
          } else {
            itemMap[item.menuItemId].extraQty += item.quantity;
          }
        }
      }
    }

    // Sort: entrees first, then sides, alphabetically within each group
    const items = Object.values(itemMap)
      .map((item) => ({
        ...item,
        totalQty: item.completaQty + item.extraQty,
      }))
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === "ENTREE" ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

    return NextResponse.json({
      weekStartDate: weeklyMenu.weekStartDate,
      dayOfWeek: dayNum,
      dayName: DAY_NAMES[dayNum] || `Day ${dayNum}`,
      totalOrders,
      totalCompletas,
      items,
    });
  } catch (error) {
    console.error("Error generating prep sheet:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
