import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateAddress } from "@/lib/address-validation";
import { randomUUID } from "crypto";
import { calculateOrderTotals, type OrderDayPayload } from "@/lib/pricing";

async function getPricingConfig() {
  const config = await prisma.pricingConfig.findFirst();
  if (!config) throw new Error("Pricing not configured");
  return {
    completaPrice: Number(config.completaPrice),
    extraEntreePrice: Number(config.extraEntreePrice),
    extraSidePrice: Number(config.extraSidePrice),
    deliveryFeePerMeal: Number(config.deliveryFeePerMeal),
  };
}

function generateOrderNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 1000000)
    .toString()
    .padStart(6, "0");
  return `LL-${year}-${random}`;
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    const body = await request.json();
    const { weeklyMenuId, orderDays, isPickup, addressId, guestInfo, guestAddress } = body;

    // --- Resolve customerId: authenticated user OR guest shadow customer ---
    let customerId: string;
    let guestToken: string | null = null;

    if (session?.user?.customerId) {
      // Authenticated path
      customerId = session.user.customerId;
    } else {
      // Guest path — validate guest info
      if (!guestInfo?.email || !guestInfo?.firstName || !guestInfo?.lastName || !guestInfo?.phone) {
        return NextResponse.json({ error: "Guest information is required" }, { status: 400 });
      }

      const email = (guestInfo.email as string).toLowerCase().trim();

      // Check if a non-guest user already exists with this email
      const existingUser = await prisma.user.findUnique({
        where: { email },
        include: { customer: true },
      });

      if (existingUser && !existingUser.isGuest) {
        return NextResponse.json(
          { error: "An account already exists with this email. Please sign in to place your order." },
          { status: 409 }
        );
      }

      if (existingUser?.isGuest && existingUser.customer) {
        // Reuse existing shadow customer
        customerId = existingUser.customer.id;
        // Update their info in case it changed
        await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            firstName: guestInfo.firstName.trim(),
            lastName: guestInfo.lastName.trim(),
            phone: guestInfo.phone.trim(),
          },
        });
      } else {
        // Create new shadow user + customer
        const shadowUser = await prisma.user.create({
          data: {
            email,
            firstName: guestInfo.firstName.trim(),
            lastName: guestInfo.lastName.trim(),
            phone: guestInfo.phone.trim(),
            password: null,
            isGuest: true,
            role: "CUSTOMER",
            customer: { create: {} },
          },
          include: { customer: true },
        });
        customerId = shadowUser.customer!.id;
      }

      guestToken = randomUUID();
    }

    // --- Validate order data ---
    const MIN_DAYS_PER_ORDER = 3;

    if (!weeklyMenuId || !orderDays || orderDays.length === 0) {
      return NextResponse.json(
        { error: "Invalid order data" },
        { status: 400 }
      );
    }

    if (orderDays.length < MIN_DAYS_PER_ORDER) {
      return NextResponse.json(
        { error: `Minimum ${MIN_DAYS_PER_ORDER} days per order required` },
        { status: 400 }
      );
    }

    for (const day of orderDays) {
      if (!day.completas || day.completas.length === 0) {
        return NextResponse.json(
          { error: `Each day must have at least 1 completa` },
          { status: 400 }
        );
      }
    }

    // --- Validate delivery/pickup ---
    let resolvedAddressId: string | null = null;

    if (!isPickup) {
      if (session?.user?.customerId) {
        // Authenticated: use saved addressId
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
        resolvedAddressId = addressId;
      } else {
        // Guest: validate and create inline address
        if (!guestAddress?.street || !guestAddress?.city || !guestAddress?.state || !guestAddress?.zipCode) {
          return NextResponse.json(
            { error: "Delivery address is required" },
            { status: 400 }
          );
        }

        const validation = await validateAddress(guestAddress);
        if (!validation.valid) {
          return NextResponse.json(
            { error: validation.errors.join(". ") },
            { status: 400 }
          );
        }

        const createdAddress = await prisma.address.create({
          data: {
            customerId,
            street: guestAddress.street.trim(),
            unit: guestAddress.unit?.trim() || null,
            city: guestAddress.city.trim(),
            state: guestAddress.state.trim().toUpperCase(),
            zipCode: guestAddress.zipCode.trim(),
            deliveryNotes: guestAddress.deliveryNotes?.trim() || null,
            isDefault: true,
          },
        });
        resolvedAddressId = createdAddress.id;
      }
    }

    // Validate the weekly menu exists and is published
    const weeklyMenu = await prisma.weeklyMenu.findUnique({
      where: { id: weeklyMenuId },
    });

    if (!weeklyMenu || !weeklyMenu.isPublished) {
      return NextResponse.json(
        { error: "Menu not available for ordering" },
        { status: 400 }
      );
    }

    // Collect all unique menu item IDs
    const menuItemIds: string[] = [
      ...new Set(
        (orderDays as OrderDayPayload[]).flatMap((day) => [
          ...day.completas.flatMap((c) => [
            c.entreeId,
            ...c.sides.map((s) => s.menuItemId),
          ]),
          ...day.extraEntrees.map((e) => e.menuItemId),
          ...day.extraSides.map((s) => s.menuItemId),
        ])
      ),
    ];

    // Validate all menu items exist
    const menuItemCount = await prisma.menuItem.count({
      where: { id: { in: menuItemIds } },
    });
    if (menuItemCount !== menuItemIds.length) {
      return NextResponse.json(
        { error: "One or more menu items not found" },
        { status: 400 }
      );
    }

    const pricing = await getPricingConfig();
    const typedOrderDays = orderDays as OrderDayPayload[];

    // Calculate totals using the shared pricing utility
    const { subtotal, deliveryFee, totalAmount } = calculateOrderTotals(
      typedOrderDays,
      pricing,
      !!isPickup
    );

    // Create the order with nested orderDays and orderItems
    const order = await prisma.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        customerId,
        weeklyMenuId,
        isPickup: !!isPickup,
        addressId: isPickup ? null : resolvedAddressId,
        paymentMethod: "CARD",
        paymentStatus: "PENDING",
        subtotal,
        deliveryFee,
        totalAmount,
        guestToken,
        orderDays: {
          create: typedOrderDays.map((day) => {
            const orderItems: {
              menuItemId: string;
              quantity: number;
              unitPrice: number;
              isCompleta: boolean;
              completaGroupId: string | null;
            }[] = [];

            day.completas.forEach((completa, cIndex) => {
              const groupId = `${Date.now()}-${day.dayOfWeek}-${cIndex}`;
              orderItems.push({
                menuItemId: completa.entreeId,
                quantity: 1,
                unitPrice: pricing.completaPrice,
                isCompleta: true,
                completaGroupId: groupId,
              });
              completa.sides.forEach((side) => {
                orderItems.push({
                  menuItemId: side.menuItemId,
                  quantity: side.quantity,
                  unitPrice: 0,
                  isCompleta: true,
                  completaGroupId: groupId,
                });
              });
            });

            day.extraEntrees.forEach((extra) => {
              orderItems.push({
                menuItemId: extra.menuItemId,
                quantity: extra.quantity,
                unitPrice: pricing.extraEntreePrice,
                isCompleta: false,
                completaGroupId: null,
              });
            });

            day.extraSides.forEach((extra) => {
              orderItems.push({
                menuItemId: extra.menuItemId,
                quantity: extra.quantity,
                unitPrice: pricing.extraSidePrice,
                isCompleta: false,
                completaGroupId: null,
              });
            });

            return {
              dayOfWeek: day.dayOfWeek,
              orderItems: {
                create: orderItems,
              },
            };
          }),
        },
      },
      include: {
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

    return NextResponse.json({ ...order, guestToken }, { status: 201 });
  } catch (error) {
    console.error("Error creating order:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get customer ID from session
    const customerId = session.user.customerId;
    if (!customerId) {
      return NextResponse.json([]);
    }

    const orders = await prisma.order.findMany({
      where: { customerId },
      include: {
        weeklyMenu: true,
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
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
