import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const data: Record<string, unknown> = {};

    if (body.name !== undefined) data.name = body.name.trim();
    if (body.isActive !== undefined) data.isActive = body.isActive;

    const driver = await prisma.driver.update({
      where: { id },
      data,
    });

    return NextResponse.json(driver);
  } catch (error) {
    console.error("Error updating driver:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const addressCount = await prisma.address.count({ where: { driverId: id } });
    if (addressCount > 0) {
      return NextResponse.json(
        { error: "Cannot delete driver with assigned addresses. Deactivate instead." },
        { status: 400 }
      );
    }

    await prisma.driver.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting driver:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
