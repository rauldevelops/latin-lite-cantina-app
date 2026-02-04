import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getCurrentMonday(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export async function GET() {
  try {
    const monday = getCurrentMonday();

    // Get all published menus from current week onwards
    const [weeklyMenus, stapleItems] = await Promise.all([
      prisma.weeklyMenu.findMany({
        where: {
          isPublished: true,
          weekStartDate: {
            gte: monday,
          },
        },
        include: {
          menuItems: {
            include: {
              menuItem: true,
            },
          },
        },
        orderBy: {
          weekStartDate: "asc",
        },
      }),
      // Get staple menu items (always available regardless of weekly menu)
      prisma.menuItem.findMany({
        where: {
          isStaple: true,
          isActive: true,
        },
      }),
    ]);

    if (weeklyMenus.length === 0) {
      return NextResponse.json(
        { error: "No menus available" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      weeklyMenus,
      stapleItems,
    });
  } catch (error) {
    console.error("Error fetching upcoming menus:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}