import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    const session = await auth();

    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { amount } = await request.json();

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Refund amount must be greater than zero" },
        { status: 400 }
      );
    }

    // Fetch order with payments
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        payments: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.paymentStatus !== "PAID") {
      return NextResponse.json(
        { error: "Can only refund orders with PAID status" },
        { status: 400 }
      );
    }

    // Calculate already-refunded amount from negative Payment records
    const alreadyRefunded = order.payments
      .filter((p) => p.status === "REFUNDED")
      .reduce((sum, p) => sum + Math.abs(Number(p.amount)), 0);

    const totalAmount = Number(order.totalAmount);
    const maxRefundable = totalAmount - alreadyRefunded;

    if (amount > maxRefundable + 0.01) {
      return NextResponse.json(
        {
          error: `Refund amount exceeds refundable balance. Maximum: $${maxRefundable.toFixed(2)}`,
        },
        { status: 400 }
      );
    }

    const refundAmount = Math.min(amount, maxRefundable);
    const isFullRefund = refundAmount + alreadyRefunded >= totalAmount - 0.01;
    let stripeRefundId: string | null = null;

    // Process Stripe refund if this was a card payment
    if (order.stripePaymentIntentId) {
      try {
        const refund = await stripe.refunds.create({
          payment_intent: order.stripePaymentIntentId,
          amount: Math.round(refundAmount * 100), // cents
        });
        stripeRefundId = refund.id;
      } catch (stripeError) {
        console.error("Stripe refund failed:", stripeError);
        const message =
          stripeError instanceof Error
            ? stripeError.message
            : "Stripe refund failed";
        return NextResponse.json({ error: message }, { status: 400 });
      }
    }

    // Create refund Payment record and update order status in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          orderId: order.id,
          amount: -refundAmount,
          method: order.paymentMethod || "CARD",
          status: "REFUNDED",
          reference: stripeRefundId,
          recordedById: session.user.id,
          notes: `Refund: $${refundAmount.toFixed(2)}${isFullRefund ? " (full)" : " (partial)"}`,
        },
      });

      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: isFullRefund ? "REFUNDED" : "PAID",
        },
      });

      return { payment, updatedOrder };
    });

    return NextResponse.json({
      message: `Refund of $${refundAmount.toFixed(2)} processed successfully`,
      refundId: stripeRefundId,
      paymentId: result.payment.id,
      paymentStatus: result.updatedOrder.paymentStatus,
      isFullRefund,
    });
  } catch (error) {
    console.error("Error processing refund:", error);
    return NextResponse.json(
      { error: "Something went wrong processing the refund" },
      { status: 500 }
    );
  }
}
