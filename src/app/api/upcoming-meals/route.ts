import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DAY_NAMES = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export async function GET() {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const customerId = session.user.customerId;
    if (!customerId) {
      return NextResponse.json({ days: [], totalUpcomingMeals: 0 });
    }

    // Get the start of today (midnight)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find orders for current and future weeks that are not cancelled
    const orders = await prisma.order.findMany({
      where: {
        customerId,
        status: { not: "CANCELLED" },
        weeklyMenu: {
          // Include menus where the week hasn't fully passed yet
          // weekStartDate is the Monday, so we include if Monday + 4 days (Friday) >= today
          weekStartDate: {
            gte: new Date(today.getTime() - 4 * 24 * 60 * 60 * 1000), // 4 days before today
          },
        },
      },
      include: {
        weeklyMenu: true,
        address: true,
        orderDays: {
          include: {
            orderItems: {
              include: {
                menuItem: true,
              },
              orderBy: { menuItem: { type: "asc" } },
            },
          },
          orderBy: { dayOfWeek: "asc" },
        },
      },
      orderBy: [
        { weeklyMenu: { weekStartDate: "asc" } },
        { createdAt: "asc" },
      ],
    });

    // Transform into a calendar view structure
    type MealDay = {
      date: string;
      dayName: string;
      dayOfWeek: number;
      isPast: boolean;
      meals: {
        orderId: string;
        orderNumber: string;
        orderStatus: string;
        isPickup: boolean;
        completas: {
          entree: string;
          sides: string[];
        }[];
        extraEntrees: { name: string; quantity: number }[];
        extraSides: { name: string; quantity: number }[];
      }[];
    };

    const calendar: MealDay[] = [];
    const processedDates = new Set<string>();

    for (const order of orders) {
      const weekStart = new Date(order.weeklyMenu.weekStartDate);

      for (const orderDay of order.orderDays) {
        // Calculate the actual date for this day
        const dayDate = new Date(weekStart);
        dayDate.setDate(weekStart.getDate() + (orderDay.dayOfWeek - 1));

        const dateStr = dayDate.toISOString().split("T")[0];
        const isPast = dayDate < today;

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

        // Build completas array
        const completas = Object.values(completaGroups).map((items) => {
          const entree = items.find((i) => i.menuItem.type === "ENTREE");
          const sides = items
            .filter((i) => i.menuItem.type === "SIDE")
            .map((i) => i.menuItem.name);
          return {
            entree: entree?.menuItem.name || "Unknown",
            sides,
          };
        });

        // Build extras arrays
        const extraEntrees = extras
          .filter((i) => i.menuItem.type === "ENTREE")
          .map((i) => ({ name: i.menuItem.name, quantity: i.quantity }));
        const extraSides = extras
          .filter((i) => i.menuItem.type === "SIDE")
          .map((i) => ({ name: i.menuItem.name, quantity: i.quantity }));

        const meal = {
          orderId: order.id,
          orderNumber: order.orderNumber,
          orderStatus: order.status,
          isPickup: order.isPickup,
          completas,
          extraEntrees,
          extraSides,
        };

        // Find or create the calendar day
        let calendarDay = calendar.find((d) => d.date === dateStr);
        if (!calendarDay) {
          calendarDay = {
            date: dateStr,
            dayName: DAY_NAMES[orderDay.dayOfWeek] || `Day ${orderDay.dayOfWeek}`,
            dayOfWeek: orderDay.dayOfWeek,
            isPast,
            meals: [],
          };
          calendar.push(calendarDay);
        }

        calendarDay.meals.push(meal);
        processedDates.add(dateStr);
      }
    }

    // Sort by date
    calendar.sort((a, b) => a.date.localeCompare(b.date));

    // Filter to only show future days (and today)
    const upcomingDays = calendar.filter((day) => !day.isPast);

    return NextResponse.json({
      days: upcomingDays,
      totalUpcomingMeals: upcomingDays.reduce(
        (sum, day) => sum + day.meals.reduce((mSum, m) => mSum + m.completas.length, 0),
        0
      ),
    });
  } catch (error) {
    console.error("Error fetching upcoming meals:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
