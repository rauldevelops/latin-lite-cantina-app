import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST add menu item to weekly menu
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;

  try {
    const session = await auth();

    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { menuItemId, dayOfWeek, isSpecial } = await request.json();

    // Validate dayOfWeek (1-5 for Mon-Fri)
    if (dayOfWeek < 1 || dayOfWeek > 5) {
      return NextResponse.json(
        { error: "Day must be between 1 (Monday) and 5 (Friday)" },
        { status: 400 }
      );
    }

    const weeklyMenuItem = await prisma.weeklyMenuItem.create({
      data: {
        weeklyMenuId: params.id,
        menuItemId,
        dayOfWeek,
        isSpecial: isSpecial || false,
      },
      include: {
        menuItem: true,
      },
    });

    return NextResponse.json(weeklyMenuItem, { status: 201 });
} catch (error) {
    console.error("Error adding menu item:", error);
    
    // Check for unique constraint violation
    if (error instanceof Error && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json(
        { error: "This item is already added to this day" },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
  
}

// DELETE remove menu item from weekly menu
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;

  try {
    const session = await auth();

    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { weeklyMenuItemId } = await request.json();

    await prisma.weeklyMenuItem.delete({
      where: { 
        id: weeklyMenuItemId,
        weeklyMenuId: params.id,
      },
    });

    return NextResponse.json({ message: "Removed successfully" });
  } catch (error) {
    console.error("Error removing menu item:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}