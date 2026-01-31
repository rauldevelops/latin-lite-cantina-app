import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const config = await prisma.pricingConfig.findFirst();

    if (!config) {
      return NextResponse.json(
        { error: "Pricing not configured" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      completaPrice: Number(config.completaPrice),
      extraEntreePrice: Number(config.extraEntreePrice),
      extraSidePrice: Number(config.extraSidePrice),
      deliveryFeePerMeal: Number(config.deliveryFeePerMeal),
    });
  } catch (error) {
    console.error("Error fetching pricing:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
