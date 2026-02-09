import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/delivery-zones
 * List all delivery zones
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const zones = await prisma.deliveryZone.findMany({
      orderBy: { zipCode: "asc" },
    });

    return NextResponse.json(zones);
  } catch (error) {
    console.error("Error fetching delivery zones:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/delivery-zones
 * Create a new delivery zone
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();
    const { zipCode, city } = data;

    if (!zipCode || typeof zipCode !== "string") {
      return NextResponse.json(
        { error: "Valid zip code is required" },
        { status: 400 }
      );
    }

    // Normalize zip code (remove spaces, take first 5 digits)
    const normalizedZip = zipCode.trim().split("-")[0];

    // Validate zip code format
    if (!/^\d{5}$/.test(normalizedZip)) {
      return NextResponse.json(
        { error: "Zip code must be 5 digits" },
        { status: 400 }
      );
    }

    // Check if already exists
    const existing = await prisma.deliveryZone.findUnique({
      where: { zipCode: normalizedZip },
    });

    if (existing) {
      return NextResponse.json(
        { error: "This zip code is already in the delivery zone list" },
        { status: 400 }
      );
    }

    const zone = await prisma.deliveryZone.create({
      data: {
        zipCode: normalizedZip,
        city: city || null,
        isActive: true,
      },
    });

    return NextResponse.json(zone, { status: 201 });
  } catch (error) {
    console.error("Error creating delivery zone:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
