import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Period = "week" | "month" | "ytd";

function getDateRange(period: Period, now: Date) {
  const startDate = new Date(now);
  const endDate = new Date(now);
  const prevStartDate = new Date(now);
  const prevEndDate = new Date(now);

  // Set to start of today
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  if (period === "week") {
    // Get Monday of current week
    const dayOfWeek = startDate.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    startDate.setDate(startDate.getDate() + diffToMonday);
    // End date is end of Sunday
    endDate.setDate(startDate.getDate() + 6);

    // Previous week
    prevStartDate.setTime(startDate.getTime());
    prevStartDate.setDate(prevStartDate.getDate() - 7);
    prevEndDate.setTime(endDate.getTime());
    prevEndDate.setDate(prevEndDate.getDate() - 7);
  } else if (period === "month") {
    // Start of current month
    startDate.setDate(1);
    // End of current month
    endDate.setMonth(endDate.getMonth() + 1, 0);

    // Previous month
    prevStartDate.setMonth(prevStartDate.getMonth() - 1, 1);
    prevEndDate.setMonth(prevEndDate.getMonth(), 0);
  } else {
    // YTD - start of year
    startDate.setMonth(0, 1);
    // End is today
    endDate.setTime(now.getTime());
    endDate.setHours(23, 59, 59, 999);

    // Previous YTD (same period last year)
    prevStartDate.setFullYear(prevStartDate.getFullYear() - 1);
    prevStartDate.setMonth(0, 1);
    prevEndDate.setFullYear(prevEndDate.getFullYear() - 1);
    prevEndDate.setTime(now.getTime());
    prevEndDate.setFullYear(prevEndDate.getFullYear() - 1);
  }

  return { startDate, endDate, prevStartDate, prevEndDate };
}

async function calculateFinancialMetrics(
  startDate: Date,
  endDate: Date,
  prevStartDate: Date,
  prevEndDate: Date
) {
  // Current period revenue by payment method
  const currentRevenue = await prisma.order.groupBy({
    by: ["paymentMethod"],
    where: {
      createdAt: { gte: startDate, lte: endDate },
      status: { not: "CANCELLED" },
      paymentStatus: { in: ["PAID", "CREDIT_ACCOUNT"] },
    },
    _sum: { totalAmount: true },
    _count: true,
  });

  // Previous period total revenue
  const prevRevenue = await prisma.order.aggregate({
    where: {
      createdAt: { gte: prevStartDate, lte: prevEndDate },
      status: { not: "CANCELLED" },
      paymentStatus: { in: ["PAID", "CREDIT_ACCOUNT"] },
    },
    _sum: { totalAmount: true },
    _count: true,
  });

  const revenueByMethod = {
    card: 0,
    cash: 0,
    check: 0,
    credit: 0,
  };

  let totalRevenue = 0;
  let totalOrders = 0;

  for (const r of currentRevenue) {
    const amount = Number(r._sum.totalAmount || 0);
    totalRevenue += amount;
    totalOrders += r._count;

    switch (r.paymentMethod) {
      case "CARD":
        revenueByMethod.card = amount;
        break;
      case "CASH":
        revenueByMethod.cash = amount;
        break;
      case "CHECK":
        revenueByMethod.check = amount;
        break;
      case "CREDIT_ACCOUNT":
        revenueByMethod.credit = amount;
        break;
    }
  }

  const previousPeriodRevenue = Number(prevRevenue._sum.totalAmount || 0);
  const revenueChangePercent =
    previousPeriodRevenue > 0
      ? ((totalRevenue - previousPeriodRevenue) / previousPeriodRevenue) * 100
      : 0;

  return {
    revenue: totalRevenue,
    revenueByMethod,
    avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
    previousPeriodRevenue,
    revenueChangePercent,
  };
}

async function calculateOrderMetrics(startDate: Date, endDate: Date) {
  // Orders by status
  const ordersByStatus = await prisma.order.groupBy({
    by: ["status"],
    where: {
      createdAt: { gte: startDate, lte: endDate },
    },
    _count: true,
  });

  const byStatus = {
    pending: 0,
    confirmed: 0,
    preparing: 0,
    outForDelivery: 0,
    delivered: 0,
    cancelled: 0,
  };

  let totalOrders = 0;
  for (const o of ordersByStatus) {
    totalOrders += o._count;
    switch (o.status) {
      case "PENDING":
        byStatus.pending = o._count;
        break;
      case "CONFIRMED":
        byStatus.confirmed = o._count;
        break;
      case "PREPARING":
        byStatus.preparing = o._count;
        break;
      case "OUT_FOR_DELIVERY":
        byStatus.outForDelivery = o._count;
        break;
      case "DELIVERED":
        byStatus.delivered = o._count;
        break;
      case "CANCELLED":
        byStatus.cancelled = o._count;
        break;
    }
  }

  // Cancelled orders value
  const cancelledOrders = await prisma.order.aggregate({
    where: {
      createdAt: { gte: startDate, lte: endDate },
      status: "CANCELLED",
    },
    _sum: { totalAmount: true },
    _count: true,
  });

  // Total completas - count unique completaGroupIds
  const completaGroups = await prisma.orderItem.findMany({
    where: {
      isCompleta: true,
      completaGroupId: { not: null },
      orderDay: {
        order: {
          createdAt: { gte: startDate, lte: endDate },
          status: { not: "CANCELLED" },
        },
      },
    },
    select: { completaGroupId: true },
    distinct: ["completaGroupId"],
  });

  const totalCompletas = completaGroups.length;
  const activeOrders = totalOrders - byStatus.cancelled;
  const avgCompletasPerOrder =
    activeOrders > 0 ? totalCompletas / activeOrders : 0;

  return {
    totalOrders,
    byStatus,
    cancelledCount: cancelledOrders._count,
    cancelledValue: Number(cancelledOrders._sum.totalAmount || 0),
    totalCompletas,
    avgCompletasPerOrder,
  };
}

async function calculateFulfillmentMetrics(startDate: Date, endDate: Date) {
  // Orders by day of week
  const orderDays = await prisma.orderDay.groupBy({
    by: ["dayOfWeek"],
    where: {
      order: {
        createdAt: { gte: startDate, lte: endDate },
        status: { not: "CANCELLED" },
      },
    },
    _count: true,
  });

  const byDay: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const d of orderDays) {
    byDay[d.dayOfWeek] = d._count;
  }

  // Pickup vs Delivery
  const pickupDelivery = await prisma.order.groupBy({
    by: ["isPickup"],
    where: {
      createdAt: { gte: startDate, lte: endDate },
      status: { not: "CANCELLED" },
    },
    _count: true,
  });

  let pickupCount = 0;
  let deliveryCount = 0;
  for (const pd of pickupDelivery) {
    if (pd.isPickup) {
      pickupCount = pd._count;
    } else {
      deliveryCount = pd._count;
    }
  }

  // Orders by driver
  const ordersByDriver = await prisma.order.findMany({
    where: {
      createdAt: { gte: startDate, lte: endDate },
      status: { not: "CANCELLED" },
      isPickup: false,
      address: {
        driverId: { not: null },
      },
    },
    select: {
      address: {
        select: {
          driverId: true,
          driver: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  const driverCounts = new Map<string, { driverId: string; driverName: string; orderCount: number }>();
  for (const order of ordersByDriver) {
    if (order.address?.driver) {
      const driverId = order.address.driver.id;
      const driverName = order.address.driver.name;
      const existing = driverCounts.get(driverId);
      if (existing) {
        existing.orderCount++;
      } else {
        driverCounts.set(driverId, { driverId, driverName, orderCount: 1 });
      }
    }
  }

  const byDriver = Array.from(driverCounts.values()).sort(
    (a, b) => b.orderCount - a.orderCount
  );

  return {
    byDay,
    pickupCount,
    deliveryCount,
    pickupRatio:
      pickupCount + deliveryCount > 0
        ? (pickupCount / (pickupCount + deliveryCount)) * 100
        : 0,
    byDriver,
  };
}

async function calculateCustomerMetrics(startDate: Date, endDate: Date) {
  // Total active customers (customers who have placed at least one order ever)
  const activeCustomers = await prisma.customer.count({
    where: {
      orders: {
        some: {},
      },
    },
  });

  // New customers this period
  const newCustomers = await prisma.customer.count({
    where: {
      createdAt: { gte: startDate, lte: endDate },
    },
  });

  // Calculate week start for "new this week"
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() + diffToMonday);
  weekStart.setHours(0, 0, 0, 0);

  const newThisWeek = await prisma.customer.count({
    where: {
      createdAt: { gte: weekStart },
    },
  });

  // Calculate month start for "new this month"
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const newThisMonth = await prisma.customer.count({
    where: {
      createdAt: { gte: monthStart },
    },
  });

  // Repeat order rate — one groupBy replaces two queries and avoids loading
  // full customer rows into memory. Groups orders by customer, then counts
  // how many customers have >1 order vs >=1 order entirely in the DB.
  const orderCountsByCustomer = await prisma.order.groupBy({
    by: ["customerId"],
    where: { status: { not: "CANCELLED" } },
    _count: { id: true },
  });

  const customersWithMultipleOrders = orderCountsByCustomer.length;
  const repeatCustomers = orderCountsByCustomer.filter(
    (g) => g._count.id > 1
  ).length;

  const repeatOrderRate =
    customersWithMultipleOrders > 0
      ? (repeatCustomers / customersWithMultipleOrders) * 100
      : 0;

  return {
    totalActive: activeCustomers,
    newThisWeek,
    newThisMonth,
    repeatOrderRate,
  };
}

async function calculateMenuMetrics(startDate: Date, endDate: Date) {
  // Get all order items with menu item details
  const orderItems = await prisma.orderItem.groupBy({
    by: ["menuItemId"],
    where: {
      orderDay: {
        order: {
          createdAt: { gte: startDate, lte: endDate },
          status: { not: "CANCELLED" },
        },
      },
    },
    _sum: { quantity: true },
  });

  // Get menu item details
  const menuItems = await prisma.menuItem.findMany({
    where: {
      id: { in: orderItems.map((oi) => oi.menuItemId) },
    },
    select: {
      id: true,
      name: true,
      type: true,
      isDessert: true,
      isSoup: true,
    },
  });

  const menuItemMap = new Map(menuItems.map((mi) => [mi.id, mi]));

  // Separate entrees and sides
  const entreeItems: { id: string; name: string; count: number }[] = [];
  const sideItems: { id: string; name: string; count: number }[] = [];

  for (const oi of orderItems) {
    const menuItem = menuItemMap.get(oi.menuItemId);
    if (!menuItem) continue;

    const item = {
      id: menuItem.id,
      name: menuItem.name,
      count: oi._sum.quantity || 0,
    };

    if (menuItem.type === "ENTREE") {
      entreeItems.push(item);
    } else {
      sideItems.push(item);
    }
  }

  // Sort and get top/bottom 5
  entreeItems.sort((a, b) => b.count - a.count);
  sideItems.sort((a, b) => b.count - a.count);

  const topEntrees = entreeItems.slice(0, 5);
  const topSides = sideItems.slice(0, 5);

  // Least popular (combine entrees and sides, get bottom 5)
  const allItems = [...entreeItems, ...sideItems].sort(
    (a, b) => a.count - b.count
  );
  const leastPopular = allItems.slice(0, 5);

  // Dessert and soup selection rates
  // Count completas that have dessert/soup selected
  const completasWithDessert = await prisma.orderItem.count({
    where: {
      isCompleta: true,
      menuItem: { isDessert: true },
      orderDay: {
        order: {
          createdAt: { gte: startDate, lte: endDate },
          status: { not: "CANCELLED" },
        },
      },
    },
  });

  const completasWithSoup = await prisma.orderItem.count({
    where: {
      isCompleta: true,
      menuItem: { isSoup: true },
      orderDay: {
        order: {
          createdAt: { gte: startDate, lte: endDate },
          status: { not: "CANCELLED" },
        },
      },
    },
  });

  // Total unique completa groups
  const totalCompletaGroups = await prisma.orderItem.findMany({
    where: {
      isCompleta: true,
      completaGroupId: { not: null },
      orderDay: {
        order: {
          createdAt: { gte: startDate, lte: endDate },
          status: { not: "CANCELLED" },
        },
      },
    },
    select: { completaGroupId: true },
    distinct: ["completaGroupId"],
  });

  const totalCompletas = totalCompletaGroups.length;

  return {
    topEntrees,
    topSides,
    leastPopular,
    dessertSelectionRate:
      totalCompletas > 0 ? (completasWithDessert / totalCompletas) * 100 : 0,
    soupSelectionRate:
      totalCompletas > 0 ? (completasWithSoup / totalCompletas) * 100 : 0,
  };
}

async function calculateOperationalMetrics() {
  const now = new Date();

  // Find the upcoming weekly menu (next Monday or current week if not yet past)
  const dayOfWeek = now.getDay();
  const diffToMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 0 : 8 - dayOfWeek;
  const upcomingMonday = new Date(now);
  upcomingMonday.setDate(now.getDate() + diffToMonday);
  upcomingMonday.setHours(0, 0, 0, 0);

  // If it's still early in the week (Mon-Wed), use current week
  const currentMonday = new Date(now);
  const currentDiffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  currentMonday.setDate(now.getDate() + currentDiffToMonday);
  currentMonday.setHours(0, 0, 0, 0);

  // Check for upcoming menu
  const upcomingMenu = await prisma.weeklyMenu.findFirst({
    where: {
      weekStartDate: {
        gte: currentMonday,
      },
      isPublished: true,
    },
    orderBy: { weekStartDate: "asc" },
  });

  let upcomingWeekOrderCount = 0;
  const completasByDay: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  if (upcomingMenu) {
    // Count orders for upcoming week
    const upcomingOrders = await prisma.order.count({
      where: {
        weeklyMenuId: upcomingMenu.id,
        status: { not: "CANCELLED" },
      },
    });
    upcomingWeekOrderCount = upcomingOrders;

    // Count completas by day for prep planning
    const orderDaysWithCompletas = await prisma.orderDay.findMany({
      where: {
        order: {
          weeklyMenuId: upcomingMenu.id,
          status: { not: "CANCELLED" },
        },
      },
      include: {
        orderItems: {
          where: {
            isCompleta: true,
            completaGroupId: { not: null },
          },
          select: { completaGroupId: true },
        },
      },
    });

    for (const day of orderDaysWithCompletas) {
      const uniqueCompletas = new Set(
        day.orderItems.map((oi) => oi.completaGroupId)
      );
      completasByDay[day.dayOfWeek] =
        (completasByDay[day.dayOfWeek] || 0) + uniqueCompletas.size;
    }
  }

  // Peak order days (last 30 days)
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentOrders = await prisma.order.findMany({
    where: {
      createdAt: { gte: thirtyDaysAgo },
      status: { not: "CANCELLED" },
    },
    select: { createdAt: true },
  });

  const ordersByDate = new Map<string, number>();
  for (const order of recentOrders) {
    const dateStr = order.createdAt.toISOString().split("T")[0];
    ordersByDate.set(dateStr, (ordersByDate.get(dateStr) || 0) + 1);
  }

  const peakOrderDays = Array.from(ordersByDate.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    upcomingWeekOrderCount,
    completasByDay,
    peakOrderDays,
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = (searchParams.get("period") as Period) || "week";

    const now = new Date();
    const { startDate, endDate, prevStartDate, prevEndDate } = getDateRange(
      period,
      now
    );

    // Fetch all metrics in parallel
    const [financial, orders, fulfillment, customers, menu, operational] =
      await Promise.all([
        calculateFinancialMetrics(startDate, endDate, prevStartDate, prevEndDate),
        calculateOrderMetrics(startDate, endDate),
        calculateFulfillmentMetrics(startDate, endDate),
        calculateCustomerMetrics(startDate, endDate),
        calculateMenuMetrics(startDate, endDate),
        calculateOperationalMetrics(),
      ]);

    return NextResponse.json({
      generatedAt: now.toISOString(),
      period: {
        type: period,
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      financial,
      orders,
      fulfillment,
      customers,
      menu,
      operational,
    });
  } catch (error) {
    console.error("Error generating dashboard:", error);
    return NextResponse.json(
      { error: "Failed to generate dashboard" },
      { status: 500 }
    );
  }
}
