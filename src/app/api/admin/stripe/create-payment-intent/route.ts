import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { stripe } from "@/lib/stripe";

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { amount, customerEmail, description } = await request.json();

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Valid amount required" },
        { status: 400 }
      );
    }

    // Convert to cents
    const amountInCents = Math.round(amount * 100);

    // Create PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: "usd",
      metadata: {
        createdBy: session.user.id,
        isAdminOrder: "true",
      },
      receipt_email: customerEmail || undefined,
      description: description || "LatinLite Cantina - Admin Order",
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    console.error("Error creating admin PaymentIntent:", error);
    return NextResponse.json(
      { error: "Failed to initialize payment" },
      { status: 500 }
    );
  }
}
