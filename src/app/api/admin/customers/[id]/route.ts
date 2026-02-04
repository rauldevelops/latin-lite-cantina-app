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

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        addresses: {
          select: {
            id: true,
            street: true,
            unit: true,
            city: true,
            state: true,
            zipCode: true,
            deliveryNotes: true,
            driverId: true,
            stopNumber: true,
            driver: { select: { id: true, name: true } },
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

    // Transform to match expected frontend format
    const result = {
      id: customer.id,
      firstName: customer.user.firstName,
      lastName: customer.user.lastName,
      email: customer.user.email,
      phone: customer.user.phone,
      isCreditAccount: customer.isCreditAccount,
      notes: customer.notes,
      createdAt: customer.createdAt,
      addresses: customer.addresses,
      orders: customer.orders,
    };

    return NextResponse.json(result);
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

    // Get customer to find associated user
    const customer = await prisma.customer.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // Update Customer fields
    const customerUpdateData: Record<string, unknown> = {};
    if (isCreditAccount !== undefined) customerUpdateData.isCreditAccount = isCreditAccount;
    if (notes !== undefined) customerUpdateData.notes = notes;

    // Update User fields
    const userUpdateData: Record<string, unknown> = {};
    if (phone !== undefined) userUpdateData.phone = phone;
    if (email !== undefined) userUpdateData.email = email;

    // Update both in transaction
    await prisma.$transaction(async (tx) => {
      if (Object.keys(customerUpdateData).length > 0) {
        await tx.customer.update({
          where: { id },
          data: customerUpdateData,
        });
      }

      if (Object.keys(userUpdateData).length > 0) {
        await tx.user.update({
          where: { id: customer.userId },
          data: userUpdateData,
        });
      }
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
              driverId: addr.driverId || null,
              stopNumber: addr.stopNumber != null ? Number(addr.stopNumber) : null,
            },
          });
        } else {
          await prisma.address.create({
            data: {
              customerId: id,
              street: addr.street,
              unit: addr.unit || null,
              city: addr.city,
              state: addr.state,
              zipCode: addr.zipCode,
              deliveryNotes: addr.deliveryNotes || null,
              driverId: addr.driverId || null,
              stopNumber: addr.stopNumber != null ? Number(addr.stopNumber) : null,
            },
          });
        }
      }
    }

    // Re-fetch with all data
    const updated = await prisma.customer.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            email: true,
            phone: true,
          },
        },
        addresses: {
          select: {
            id: true,
            street: true,
            unit: true,
            city: true,
            state: true,
            zipCode: true,
            deliveryNotes: true,
            driverId: true,
            stopNumber: true,
            driver: { select: { id: true, name: true } },
          },
        },
      },
    });

    // Transform response
    const result = {
      id: updated!.id,
      email: updated!.user.email,
      isCreditAccount: updated!.isCreditAccount,
      notes: updated!.notes,
      phone: updated!.user.phone,
      addresses: updated!.addresses,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error updating customer:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
