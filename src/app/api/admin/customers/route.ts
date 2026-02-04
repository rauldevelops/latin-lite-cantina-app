import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const creditOnly = searchParams.get("creditOnly") === "true";

    const where: Record<string, unknown> = {};

    if (creditOnly) {
      where.isCreditAccount = true;
    }

    if (search) {
      where.OR = [
        { user: { firstName: { contains: search, mode: "insensitive" } } },
        { user: { lastName: { contains: search, mode: "insensitive" } } },
        { user: { email: { contains: search, mode: "insensitive" } } },
        { user: { phone: { contains: search, mode: "insensitive" } } },
      ];
    }

    const customers = await prisma.customer.findMany({
      where,
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
        _count: { select: { orders: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Transform to match expected frontend format
    const result = customers.map((c) => ({
      id: c.id,
      firstName: c.user.firstName,
      lastName: c.user.lastName,
      email: c.user.email,
      phone: c.user.phone,
      isCreditAccount: c.isCreditAccount,
      createdAt: c.createdAt,
      _count: c._count,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching customers:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { firstName, lastName, email, phone, isCreditAccount, notes, address } =
      await request.json();

    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: "First name and last name are required" },
        { status: 400 }
      );
    }

    if (email) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return NextResponse.json(
          { error: "A user with this email already exists" },
          { status: 400 }
        );
      }
    }

    // Create User and Customer in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create User
      const user = await tx.user.create({
        data: {
          firstName,
          lastName,
          email: email || null,
          phone: phone || null,
          role: "CUSTOMER",
        },
      });

      // Create Customer linked to User
      const customer = await tx.customer.create({
        data: {
          userId: user.id,
          isCreditAccount: !!isCreditAccount,
          notes: notes || null,
          ...(address && address.street
            ? {
                addresses: {
                  create: {
                    street: address.street,
                    unit: address.unit || null,
                    city: address.city,
                    state: address.state,
                    zipCode: address.zipCode,
                    deliveryNotes: address.deliveryNotes || null,
                  },
                },
              }
            : {}),
        },
        include: {
          user: {
            select: {
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
            },
          },
        },
      });

      return customer;
    });

    // Transform to match expected frontend format
    const response = {
      id: result.id,
      firstName: result.user.firstName,
      lastName: result.user.lastName,
      email: result.user.email,
      phone: result.user.phone,
      isCreditAccount: result.isCreditAccount,
      addresses: result.addresses,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("Error creating customer:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
