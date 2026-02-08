import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendCartStartedEvent } from "@/lib/loops/events";

/**
 * POST /api/cart/session
 * Records when a user starts adding items to cart (for abandoned cart tracking)
 * Only tracks logged-in users with emails
 */
export async function POST(request: Request) {
  const session = await auth();

  // Silently skip for guests - we don't have their email yet
  if (!session?.user?.id) {
    return NextResponse.json({ ok: true });
  }

  try {
    const { weeklyMenuId } = await request.json();

    if (!weeklyMenuId) {
      return NextResponse.json(
        { error: "weeklyMenuId is required" },
        { status: 400 }
      );
    }

    // Check for existing active cart session for this menu
    const existing = await prisma.cartSession.findFirst({
      where: {
        userId: session.user.id,
        weeklyMenuId,
        convertedAt: null,
      },
    });

    if (existing) {
      // Already tracking this cart
      return NextResponse.json({ sessionId: existing.id });
    }

    // Create new cart session
    const cartSession = await prisma.cartSession.create({
      data: {
        userId: session.user.id,
        weeklyMenuId,
      },
    });

    // Get user email and send cart_started event to Loops
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, firstName: true },
    });

    if (user?.email) {
      await sendCartStartedEvent(user.email, user.firstName, weeklyMenuId);
    }

    return NextResponse.json({ sessionId: cartSession.id });
  } catch (error) {
    console.error("Error creating cart session:", error);
    return NextResponse.json(
      { error: "Failed to create cart session" },
      { status: 500 }
    );
  }
}
