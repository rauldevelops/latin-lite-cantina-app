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
    const nextDay = new Date(monday);
    nextDay.setDate(nextDay.getDate() + 1);

    const weeklyMenu = await prisma.weeklyMenu.findFirst({
      where: {
        isPublished: true,
        weekStartDate: {
          gte: monday,
          lt: nextDay,
        },
      },
      include: {
        menuItems: {
          include: {
            menuItem: true,
          },
        },
      },
    });

    if (!weeklyMenu) {
      return NextResponse.json(
        { error: "No menu available for this week" },
        { status: 404 }
      );
    }

    return NextResponse.json(weeklyMenu);
  } catch (error) {
    console.error("Error fetching current menu:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}