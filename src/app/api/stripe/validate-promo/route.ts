import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { stripe } from "@/lib/stripe";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code, subtotal } = await request.json();

    if (!code) {
      return NextResponse.json({ error: "Promo code required" }, { status: 400 });
    }

    // Search for active promotion codes matching this code
    // Try exact match first, then uppercase
    let promotionCodes = await stripe.promotionCodes.list({
      code: code.trim(),
      active: true,
      limit: 1,
    });

    // If not found, try uppercase
    if (promotionCodes.data.length === 0) {
      promotionCodes = await stripe.promotionCodes.list({
        code: code.trim().toUpperCase(),
        active: true,
        limit: 1,
      });
    }

    if (promotionCodes.data.length === 0) {
      return NextResponse.json(
        { error: "Invalid or expired promo code" },
        { status: 400 }
      );
    }

    const promotionCode = promotionCodes.data[0];

    // Get the coupon ID from the promotion code
    // The coupon is nested under promotionCode.promotion.coupon
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const promoData = promotionCode as any;
    const couponId = promoData.promotion?.coupon;

    if (!couponId) {
      return NextResponse.json(
        { error: "Invalid promo code configuration" },
        { status: 400 }
      );
    }

    // Fetch the full coupon details
    const coupon = await stripe.coupons.retrieve(couponId);

    // Check if coupon is still valid
    if (!coupon.valid) {
      return NextResponse.json(
        { error: "This promo code has expired" },
        { status: 400 }
      );
    }

    // Check redemption limits
    if (promotionCode.max_redemptions && promotionCode.times_redeemed >= promotionCode.max_redemptions) {
      return NextResponse.json(
        { error: "This promo code has reached its usage limit" },
        { status: 400 }
      );
    }

    // Check minimum amount if specified
    if (coupon.amount_off && subtotal) {
      const minAmount = coupon.amount_off / 100; // Convert from cents
      if (subtotal < minAmount) {
        return NextResponse.json(
          { error: `Minimum order of $${minAmount.toFixed(2)} required for this code` },
          { status: 400 }
        );
      }
    }

    // Calculate discount amount
    let discountAmount = 0;
    let discountDescription = "";

    if (coupon.percent_off) {
      discountAmount = (subtotal * coupon.percent_off) / 100;
      discountDescription = `${coupon.percent_off}% off`;
    } else if (coupon.amount_off) {
      discountAmount = coupon.amount_off / 100; // Convert from cents
      discountDescription = `$${discountAmount.toFixed(2)} off`;
    }

    // Round to 2 decimal places
    discountAmount = Math.round(discountAmount * 100) / 100;

    // Don't let discount exceed subtotal
    if (discountAmount > subtotal) {
      discountAmount = subtotal;
    }

    return NextResponse.json({
      valid: true,
      code: code.toUpperCase(),
      couponId: coupon.id,
      discountAmount,
      discountDescription,
      couponName: coupon.name || code.toUpperCase(),
    });
  } catch (error) {
    console.error("Error validating promo code:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to validate promo code: ${errorMessage}` },
      { status: 500 }
    );
  }
}
