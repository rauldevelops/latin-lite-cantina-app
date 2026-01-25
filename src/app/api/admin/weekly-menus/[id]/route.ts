import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET single weekly menu with items
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;

  try {
    const session = await auth();

    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const weeklyMenu = await prisma.weeklyMenu.findUnique({
      where: { id: params.id },
      include: {
        menuItems: {
          include: {
            menuItem: true,
          },
          orderBy: [{ dayOfWeek: "asc" }, { menuItem: { type: "asc" } }],
        },
      },
    });

    if (!weeklyMenu) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(weeklyMenu);
  } catch (error) {
    console.error("Error fetching weekly menu:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

// PUT update weekly menu (publish/unpublish)
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;

  try {
    const session = await auth();

    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { isPublished } = await request.json();

    const weeklyMenu = await prisma.weeklyMenu.update({
      where: { id: params.id },
      data: {
        isPublished,
        publishedAt: isPublished ? new Date() : null,
      },
    });

    return NextResponse.json(weeklyMenu);
  } catch (error) {
    console.error("Error updating weekly menu:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

// DELETE weekly menu
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

    // Delete associated menu items first
    await prisma.weeklyMenuItem.deleteMany({
      where: { weeklyMenuId: params.id },
    });

    await prisma.weeklyMenu.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: "Deleted successfully" });
  } catch (error) {
    console.error("Error deleting weekly menu:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}