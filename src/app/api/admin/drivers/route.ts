import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const activeOnly = request.nextUrl.searchParams.get("activeOnly") === "true";

    const drivers = await prisma.driver.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: { name: "asc" },
      include: { _count: { select: { addresses: true } } },
    });

    return NextResponse.json(drivers);
  } catch (error) {
    console.error("Error fetching drivers:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name } = await request.json();
    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const driver = await prisma.driver.create({
      data: { name: name.trim() },
    });

    return NextResponse.json(driver, { status: 201 });
  } catch (error) {
    console.error("Error creating driver:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
