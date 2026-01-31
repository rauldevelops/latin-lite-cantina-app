import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();

    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let config = await prisma.pricingConfig.findFirst();

    if (!config) {
      config = await prisma.pricingConfig.create({
        data: {
          completaPrice: 12.0,
          extraEntreePrice: 7.0,
          extraSidePrice: 4.0,
          deliveryFeePerMeal: 2.0,
        },
      });
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error("Error fetching pricing config:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();

    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();
    const { completaPrice, extraEntreePrice, extraSidePrice, deliveryFeePerMeal } = data;

    let config = await prisma.pricingConfig.findFirst();

    if (config) {
      config = await prisma.pricingConfig.update({
        where: { id: config.id },
        data: {
          completaPrice: parseFloat(completaPrice),
          extraEntreePrice: parseFloat(extraEntreePrice),
          extraSidePrice: parseFloat(extraSidePrice),
          deliveryFeePerMeal: parseFloat(deliveryFeePerMeal),
        },
      });
    } else {
      config = await prisma.pricingConfig.create({
        data: {
          completaPrice: parseFloat(completaPrice),
          extraEntreePrice: parseFloat(extraEntreePrice),
          extraSidePrice: parseFloat(extraSidePrice),
          deliveryFeePerMeal: parseFloat(deliveryFeePerMeal),
        },
      });
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error("Error updating pricing config:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
