import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    const session = await auth();

    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const customer = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        isCreditAccount: true,
        notes: true,
        createdAt: true,
        addresses: {
          select: {
            id: true,
            street: true,
            unit: true,
            city: true,
            state: true,
            zipCode: true,
            deliveryNotes: true,
          },
        },
        orders: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            paymentStatus: true,
            isPickup: true,
            totalAmount: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    return NextResponse.json(customer);
  } catch (error) {
    console.error("Error fetching customer:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    const session = await auth();

    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();
    const { isCreditAccount, notes, phone, email, addresses } = data;

    const updateData: Record<string, unknown> = {};
    if (isCreditAccount !== undefined) updateData.isCreditAccount = isCreditAccount;
    if (notes !== undefined) updateData.notes = notes;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;

    const customer = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        isCreditAccount: true,
        notes: true,
        phone: true,
      },
    });

    // Update addresses if provided
    if (Array.isArray(addresses)) {
      for (const addr of addresses) {
        if (addr._delete && addr.id) {
          // Check if address is used by any orders
          const orderCount = await prisma.order.count({
            where: { addressId: addr.id },
          });
          if (orderCount === 0) {
            await prisma.address.delete({ where: { id: addr.id } });
          }
        } else if (addr.id) {
          await prisma.address.update({
            where: { id: addr.id },
            data: {
              street: addr.street,
              unit: addr.unit || null,
              city: addr.city,
              state: addr.state,
              zipCode: addr.zipCode,
              deliveryNotes: addr.deliveryNotes || null,
            },
          });
        } else {
          await prisma.address.create({
            data: {
              userId: id,
              street: addr.street,
              unit: addr.unit || null,
              city: addr.city,
              state: addr.state,
              zipCode: addr.zipCode,
              deliveryNotes: addr.deliveryNotes || null,
            },
          });
        }
      }
    }

    // Re-fetch with addresses
    const updated = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        isCreditAccount: true,
        notes: true,
        phone: true,
        addresses: {
          select: {
            id: true,
            street: true,
            unit: true,
            city: true,
            state: true,
            zipCode: true,
            deliveryNotes: true,
          },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating customer:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
