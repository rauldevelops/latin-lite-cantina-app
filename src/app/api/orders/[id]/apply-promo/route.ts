import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await context.params;

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const customerId = session.user.customerId;
    if (!customerId) {
      return NextResponse.json({ error: "Customer account not found" }, { status: 400 });
    }

    const { code } = await request.json();

    // Fetch the order
    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Verify ownership
    if (order.customerId !== customerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only allow updates before payment
    if (order.paymentStatus === "PAID") {
      return NextResponse.json(
        { error: "Cannot modify a paid order" },
        { status: 400 }
      );
    }

    // If removing promo code
    if (!code) {
      const newTotalAmount = Number(order.subtotal) + Number(order.deliveryFee);

      const updatedOrder = await prisma.order.update({
        where: { id },
        data: {
          promoCode: null,
          stripeCouponId: null,
          discountAmount: 0,
          totalAmount: newTotalAmount,
        },
      });

      // Update PaymentIntent if exists
      if (order.stripePaymentIntentId) {
        const amountInCents = Math.round(newTotalAmount * 100);
        await stripe.paymentIntents.update(order.stripePaymentIntentId, {
          amount: amountInCents,
        });
      }

      return NextResponse.json({
        order: updatedOrder,
        discountRemoved: true,
      });
    }

    // Validate the promo code with Stripe
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
      console.error("Coupon reference is missing from promotion code");
      return NextResponse.json(
        { error: "Invalid promo code configuration - no coupon attached" },
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

    // Calculate discount amount based on subtotal (before delivery fee)
    const subtotal = Number(order.subtotal);
    let discountAmount = 0;

    if (coupon.percent_off) {
      discountAmount = (subtotal * coupon.percent_off) / 100;
    } else if (coupon.amount_off) {
      discountAmount = coupon.amount_off / 100; // Convert from cents
    }

    // Round to 2 decimal places
    discountAmount = Math.round(discountAmount * 100) / 100;

    // Don't let discount exceed subtotal
    if (discountAmount > subtotal) {
      discountAmount = subtotal;
    }

    // Calculate new total: subtotal - discount + delivery fee
    const newTotalAmount = subtotal - discountAmount + Number(order.deliveryFee);

    // Update the order
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        promoCode: code.toUpperCase(),
        stripeCouponId: coupon.id,
        discountAmount,
        totalAmount: newTotalAmount,
      },
    });

    // Update PaymentIntent if exists
    if (order.stripePaymentIntentId) {
      const amountInCents = Math.round(newTotalAmount * 100);
      await stripe.paymentIntents.update(order.stripePaymentIntentId, {
        amount: amountInCents,
        metadata: {
          ...{ orderId: order.id, orderNumber: order.orderNumber, customerId: order.customerId },
          promoCode: code.toUpperCase(),
          discountAmount: discountAmount.toString(),
        },
      });
    }

    return NextResponse.json({
      order: updatedOrder,
      discountAmount,
      discountDescription: coupon.percent_off
        ? `${coupon.percent_off}% off`
        : `$${discountAmount.toFixed(2)} off`,
      promoCode: code.toUpperCase(),
    });
  } catch (error) {
    console.error("Error applying promo code:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to apply promo code: ${errorMessage}` },
      { status: 500 }
    );
  }
}
