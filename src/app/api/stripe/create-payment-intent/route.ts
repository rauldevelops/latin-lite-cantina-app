import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId } = await request.json();

    if (!orderId) {
      return NextResponse.json({ error: "Order ID required" }, { status: 400 });
    }

    // Fetch the order with customer info
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: {
          include: {
            user: { select: { email: true } },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Verify ownership - compare to session.user.customerId
    if (order.customerId !== session.user.customerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if already paid
    if (order.paymentStatus === "PAID") {
      return NextResponse.json(
        { error: "Order already paid" },
        { status: 400 }
      );
    }

    // Check if PaymentIntent already exists
    if (order.stripePaymentIntentId) {
      // Retrieve existing PaymentIntent
      const existingIntent = await stripe.paymentIntents.retrieve(
        order.stripePaymentIntentId
      );

      if (existingIntent.status === "succeeded") {
        return NextResponse.json(
          { error: "Payment already completed" },
          { status: 400 }
        );
      }

      // Return existing client secret for retry
      return NextResponse.json({
        clientSecret: existingIntent.client_secret,
        paymentIntentId: existingIntent.id,
      });
    }

    // Create new PaymentIntent
    const amount = Math.round(Number(order.totalAmount) * 100); // Convert to cents

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "usd",
      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerId: order.customerId,
      },
      receipt_email: order.customer.user.email || undefined,
      description: `Latin Lite Cantina - Order ${order.orderNumber}`,
    });

    // Store PaymentIntent ID on the order
    await prisma.order.update({
      where: { id: orderId },
      data: { stripePaymentIntentId: paymentIntent.id },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    console.error("Error creating PaymentIntent:", error);
    return NextResponse.json(
      { error: "Failed to initialize payment" },
      { status: 500 }
    );
  }
}
