import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const weekStartDateStr = searchParams.get("weekStartDate");

    if (!weekStartDateStr) {
      return NextResponse.json({ error: "weekStartDate is required" }, { status: 400 });
    }

    const weekStartDate = new Date(weekStartDateStr);
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 5); // Friday end of day

    // Fetch pricing config
    const pricingConfig = await prisma.pricingConfig.findFirst();
    if (!pricingConfig) {
      return NextResponse.json({ error: "Pricing not configured" }, { status: 500 });
    }

    const deliveryFeePerMeal = Number(pricingConfig.deliveryFeePerMeal);

    // Fetch all delivered orders for the week with delivery (not pickup)
    const orders = await prisma.order.findMany({
      where: {
        status: "DELIVERED",
        isPickup: false,
        weeklyMenu: {
          weekStartDate: {
            gte: weekStartDate,
            lt: weekEndDate,
          },
        },
      },
      select: {
        address: {
          select: {
            driverId: true,
            driver: {
              select: { id: true, name: true },
            },
          },
        },
        orderDays: {
          select: {
            dayOfWeek: true,
            orderItems: {
              select: {
                isCompleta: true,
                completaGroupId: true,
                quantity: true,
                menuItem: {
                  select: { type: true },
                },
              },
            },
          },
        },
      },
    });

    // Calculate pay by driver
    type DriverPayData = {
      driverId: string;
      driverName: string;
      dailyBreakdown: Record<number, { mealCount: number; deliveryCount: number }>;
      totalMeals: number;
      totalDeliveries: number;
      totalPay: number;
    };

    const driverPayMap = new Map<string, DriverPayData>();

    for (const order of orders) {
      const driverId = order.address?.driverId;
      const driverName = order.address?.driver?.name;

      if (!driverId || !driverName) {
        // Skip orders without driver assignment
        continue;
      }

      if (!driverPayMap.has(driverId)) {
        driverPayMap.set(driverId, {
          driverId,
          driverName,
          dailyBreakdown: {},
          totalMeals: 0,
          totalDeliveries: 0,
          totalPay: 0,
        });
      }

      const driverData = driverPayMap.get(driverId)!;
      driverData.totalDeliveries += 1;

      for (const day of order.orderDays) {
        // Count meals: completas + extra entrees
        let mealsThisDay = 0;

        // Count unique completa groups (each group = 1 meal)
        const completaGroups = new Set<string>();
        for (const item of day.orderItems) {
          if (item.isCompleta && item.completaGroupId) {
            completaGroups.add(item.completaGroupId);
          }
        }
        mealsThisDay += completaGroups.size;

        // Count extra entrees
        for (const item of day.orderItems) {
          if (!item.isCompleta && item.menuItem.type === "ENTREE") {
            mealsThisDay += item.quantity;
          }
        }

        if (!driverData.dailyBreakdown[day.dayOfWeek]) {
          driverData.dailyBreakdown[day.dayOfWeek] = { mealCount: 0, deliveryCount: 0 };
        }

        driverData.dailyBreakdown[day.dayOfWeek].mealCount += mealsThisDay;
        driverData.dailyBreakdown[day.dayOfWeek].deliveryCount += 1;
        driverData.totalMeals += mealsThisDay;
      }
    }

    // Calculate pay
    const driverPayReport = Array.from(driverPayMap.values()).map((data) => ({
      ...data,
      totalPay: data.totalMeals * deliveryFeePerMeal,
    }));

    // Sort by driver name
    driverPayReport.sort((a, b) => a.driverName.localeCompare(b.driverName));

    return NextResponse.json({
      weekStartDate: weekStartDateStr,
      deliveryFeePerMeal,
      drivers: driverPayReport,
      totalMealsAllDrivers: driverPayReport.reduce((sum, d) => sum + d.totalMeals, 0),
      totalPayAllDrivers: driverPayReport.reduce((sum, d) => sum + d.totalPay, 0),
    });
  } catch (error) {
    console.error("Error generating driver pay report:", error);
    return NextResponse.json(
      { error: "Failed to generate pay report" },
      { status: 500 }
    );
  }
}
