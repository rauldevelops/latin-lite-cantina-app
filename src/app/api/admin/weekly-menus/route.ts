import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET all weekly menus
export async function GET() {
  try {
    const session = await auth();

    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const weeklyMenus = await prisma.weeklyMenu.findMany({
      orderBy: { weekStartDate: "desc" },
      include: {
        menuItems: {
          include: {
            menuItem: true,
          },
        },
      },
    });

    return NextResponse.json(weeklyMenus);
  } catch (error) {
    console.error("Error fetching weekly menus:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

// POST create weekly menu
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { weekStartDate, cloneFromId } = await request.json();

    // Parse date as local time (not UTC)
    const [year, month, day] = weekStartDate.split('-').map(Number);
    const date = new Date(year, month - 1, day); // month is 0-indexed

    if (date.getDay() !== 1) {
      return NextResponse.json(
        { error: "Week start date must be a Monday" },
        { status: 400 }
      );
    }

    // Check if menu already exists for this week
    const existing = await prisma.weeklyMenu.findUnique({
      where: { weekStartDate: date },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A menu already exists for this week" },
        { status: 400 }
      );
    }

    const weeklyMenu = await prisma.weeklyMenu.create({
      data: {
        weekStartDate: date,
      },
    });

      // If cloning from another menu, copy all its items
      if (cloneFromId) {
        const sourceMenu = await prisma.weeklyMenu.findUnique({
          where: { id: cloneFromId },
          include: { menuItems: true },
        });
  
        if (sourceMenu && sourceMenu.menuItems.length > 0) {
          await prisma.weeklyMenuItem.createMany({
            data: sourceMenu.menuItems.map((item) => ({
              weeklyMenuId: weeklyMenu.id,
              menuItemId: item.menuItemId,
              dayOfWeek: item.dayOfWeek,
              isSpecial: item.isSpecial,
            })),
          });
        }
      }
    
    return NextResponse.json(weeklyMenu, { status: 201 });
  } catch (error) {
    console.error("Error creating weekly menu:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}