import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OrderStatus, PaymentStatus } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { orderIds, status, paymentStatus } = body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json(
        { error: "orderIds array is required" },
        { status: 400 }
      );
    }

    if (!status && !paymentStatus) {
      return NextResponse.json(
        { error: "At least one of status or paymentStatus is required" },
        { status: 400 }
      );
    }

    // Build update data object
    const updateData: {
      status?: OrderStatus;
      paymentStatus?: PaymentStatus;
    } = {};

    if (status) {
      updateData.status = status as OrderStatus;
    }

    if (paymentStatus) {
      updateData.paymentStatus = paymentStatus as PaymentStatus;
    }

    // Perform bulk update
    const result = await prisma.order.updateMany({
      where: {
        id: {
          in: orderIds,
        },
      },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      updatedCount: result.count,
    });
  } catch (error) {
    console.error("Bulk update error:", error);
    return NextResponse.json(
      { error: "Failed to update orders" },
      { status: 500 }
    );
  }
}
