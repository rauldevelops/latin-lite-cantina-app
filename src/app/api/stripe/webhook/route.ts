import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { sendOrderConfirmationEmail } from "@/lib/emails/order-confirmation";
import Stripe from "stripe";

export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error("STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Handle the event
  switch (event.type) {
    case "payment_intent.succeeded": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const orderId = paymentIntent.metadata.orderId;

      if (orderId) {
        try {
          await prisma.$transaction(async (tx) => {
            // Update order payment status
            await tx.order.update({
              where: { id: orderId },
              data: {
                paymentStatus: "PAID",
                status: "CONFIRMED",
              },
            });

            // Create Payment record
            await tx.payment.create({
              data: {
                orderId,
                amount: paymentIntent.amount / 100, // Convert from cents
                method: "CARD",
                status: "PAID",
                reference: paymentIntent.id,
                notes: `Stripe PaymentIntent: ${paymentIntent.id}`,
              },
            });
          });

          console.log(`Order ${orderId} marked as PAID via webhook`);

          // Send order confirmation email
          const emailResult = await sendOrderConfirmationEmail(orderId);
          if (emailResult.success) {
            console.log(`Order confirmation email sent for ${orderId}`);
          } else {
            console.error(`Failed to send confirmation email for ${orderId}:`, emailResult.error);
          }
        } catch (dbError) {
          console.error(`Failed to update order ${orderId}:`, dbError);
        }
      }
      break;
    }

    case "payment_intent.payment_failed": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const orderId = paymentIntent.metadata.orderId;

      if (orderId) {
        try {
          await prisma.order.update({
            where: { id: orderId },
            data: { paymentStatus: "FAILED" },
          });

          console.log(`Order ${orderId} payment FAILED via webhook`);
        } catch (dbError) {
          console.error(`Failed to update order ${orderId}:`, dbError);
        }
      }
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
