import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await context.params;

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        weeklyMenu: true,
        address: true,
        orderDays: {
          include: {
            orderItems: {
              include: {
                menuItem: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Only allow users to see their own orders (unless admin)
    // Now comparing customerId to session.user.customerId
    if (order.customerId !== session.user.customerId && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error("Error fetching order:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

// PUT - Update order delivery method (before payment)
export async function PUT(
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

    const { isPickup, addressId } = await request.json();

    // Fetch the order
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        orderDays: {
          include: {
            orderItems: true,
          },
        },
      },
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

    // Validate address if delivery
    if (!isPickup) {
      if (!addressId) {
        return NextResponse.json(
          { error: "Delivery address is required" },
          { status: 400 }
        );
      }
      const address = await prisma.address.findUnique({ where: { id: addressId } });
      if (!address || address.customerId !== customerId) {
        return NextResponse.json(
          { error: "Invalid delivery address" },
          { status: 400 }
        );
      }
    }

    // Get pricing to recalculate delivery fee
    const pricingConfig = await prisma.pricingConfig.findFirst();
    if (!pricingConfig) {
      return NextResponse.json({ error: "Pricing not configured" }, { status: 500 });
    }

    const deliveryFeePerMeal = Number(pricingConfig.deliveryFeePerMeal);

    // Count total meals (completas + extra entrees)
    let totalMeals = 0;
    for (const day of order.orderDays) {
      const completaGroups = new Set(
        day.orderItems.filter((i) => i.isCompleta && i.completaGroupId).map((i) => i.completaGroupId)
      );
      totalMeals += completaGroups.size;
      // Extra entrees (not completa, unit price matches extra entree price)
      const extraEntreePrice = Number(pricingConfig.extraEntreePrice);
      totalMeals += day.orderItems
        .filter((i) => !i.isCompleta && Number(i.unitPrice) === extraEntreePrice)
        .reduce((sum, i) => sum + i.quantity, 0);
    }

    const newDeliveryFee = isPickup ? 0 : totalMeals * deliveryFeePerMeal;
    const newTotalAmount = Number(order.subtotal) + newDeliveryFee;

    // Update the order
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        isPickup: !!isPickup,
        addressId: isPickup ? null : addressId,
        deliveryFee: newDeliveryFee,
        totalAmount: newTotalAmount,
      },
    });

    // If PaymentIntent exists, update its amount
    if (order.stripePaymentIntentId) {
      const amountInCents = Math.round(newTotalAmount * 100);
      await stripe.paymentIntents.update(order.stripePaymentIntentId, {
        amount: amountInCents,
      });
    }

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error("Error updating order:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
