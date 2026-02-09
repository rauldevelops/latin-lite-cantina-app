import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * PATCH /api/admin/delivery-zones/[id]
 * Update a delivery zone (toggle active status or update city)
 */
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
    const data = await request.json();
    const { isActive, city } = data;

    const updateData: { isActive?: boolean; city?: string | null } = {};

    if (typeof isActive === "boolean") {
      updateData.isActive = isActive;
    }

    if (city !== undefined) {
      updateData.city = city || null;
    }

    const zone = await prisma.deliveryZone.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(zone);
  } catch (error) {
    console.error("Error updating delivery zone:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/delivery-zones/[id]
 * Delete a delivery zone
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await prisma.deliveryZone.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting delivery zone:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
