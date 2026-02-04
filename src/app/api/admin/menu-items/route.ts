import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET all menu items
export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const stapleOnly = searchParams.get("stapleOnly") === "true";

    const menuItems = await prisma.menuItem.findMany({
      where: stapleOnly
        ? { isStaple: true, isActive: true }
        : undefined,
      orderBy: { name: "asc" },
    });

    return NextResponse.json(menuItems);
  } catch (error) {
    console.error("Error fetching menu items:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

// POST create menu item
export async function POST(request: Request) {
  try {
    const session = await auth();
    
    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();
    const { name, description, imageUrl, type, isDessert, isSoup, isStaple } = data;

    const menuItem = await prisma.menuItem.create({
      data: {
        name,
        description,
        imageUrl,
        type,
        isDessert: isDessert || false,
        isSoup: isSoup || false,
        isStaple: isStaple || false,
      },
    });

    return NextResponse.json(menuItem, { status: 201 });
  } catch (error) {
    console.error("Error creating menu item:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}