import { loops } from "@/lib/loops";
import { prisma } from "@/lib/prisma";
import { formatFullDate } from "@/lib/timezone";

const DAY_NAMES = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatCurrency(amount: any): string {
  const num = Number(amount);
  return `$${num.toFixed(2)}`;
}

type OrderItem = {
  menuItem: { name: string };
  quantity: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  unitPrice: any;
  isCompleta: boolean;
  completaGroupId: string | null;
};

type OrderDay = {
  dayOfWeek: number;
  orderItems: OrderItem[];
};

function generateOrderItemsHtml(orderDays: OrderDay[]): string {
  let html = "";

  for (const day of orderDays) {
    const dayName = DAY_NAMES[day.dayOfWeek] || `Day ${day.dayOfWeek}`;

    html += `<div style="margin-bottom: 16px;">
      <h3 style="color: #16a34a; font-size: 15px; margin: 0 0 6px 0; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px;">${dayName}</h3>`;

    // Group items by completaGroupId
    const completaGroups = new Map<string, OrderItem[]>();
    const extras: OrderItem[] = [];

    for (const item of day.orderItems) {
      if (item.isCompleta && item.completaGroupId) {
        const existing = completaGroups.get(item.completaGroupId) || [];
        existing.push(item);
        completaGroups.set(item.completaGroupId, existing);
      } else {
        extras.push(item);
      }
    }

    // Render completas
    let completaIndex = 1;
    for (const [, items] of completaGroups) {
      const entree = items.find((i) => Number(i.unitPrice) > 0);
      const sides = items.filter((i) => Number(i.unitPrice) === 0);

      const sidesList = sides.length > 0
        ? `<ul style="margin: 2px 0 0 0; padding-left: 20px; color: #4b5563; font-size: 13px;">${sides.map((s) => `<li style="margin: 0; padding: 0;">${s.menuItem.name}</li>`).join("")}</ul>`
        : "<span style=\"color: #6b7280; font-size: 13px;\">None</span>";

      html += `<div style="background: #f9fafb; padding: 8px 10px; border-radius: 4px; margin-bottom: 6px;">
        <div style="font-weight: 600; color: #374151; font-size: 14px; margin-bottom: 2px;">Completa ${completaIndex}</div>
        <div style="color: #4b5563; font-size: 13px; margin-bottom: 2px;"><strong>Entree:</strong> ${entree?.menuItem.name || "Unknown"}</div>
        <div style="color: #4b5563; font-size: 13px;"><strong>Sides:</strong>${sidesList}</div>
      </div>`;
      completaIndex++;
    }

    // Render extras
    if (extras.length > 0) {
      html += `<div style="margin-top: 4px;">`;
      for (const item of extras) {
        html += `<div style="color: #4b5563; font-size: 13px; padding: 2px 0;">${item.quantity > 1 ? `${item.quantity}x ` : ""}${item.menuItem.name} <span style="color: #6b7280;">(Extra - ${formatCurrency(item.unitPrice)}${item.quantity > 1 ? " each" : ""})</span></div>`;
      }
      html += `</div>`;
    }

    html += `</div>`;
  }

  return html;
}

export async function sendOrderConfirmationEmail(orderId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Fetch full order with all relations
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
        address: true,
        weeklyMenu: { select: { weekStartDate: true } },
        orderDays: {
          include: {
            orderItems: {
              include: { menuItem: { select: { name: true } } },
            },
          },
          orderBy: { dayOfWeek: "asc" },
        },
      },
    });

    if (!order) {
      return { success: false, error: "Order not found" };
    }

    if (!order.customer.user.email) {
      return { success: false, error: "Customer email not found" };
    }

    const customerName = order.customer.user.firstName || "Customer";
    const orderItemsHtml = generateOrderItemsHtml(order.orderDays as OrderDay[]);

    // Build delivery/pickup info
    let deliveryInfoHtml = "";
    if (order.isPickup) {
      deliveryInfoHtml = `
        <div style="background: #fef3c7; padding: 16px; border-radius: 8px; margin-top: 20px;">
          <h3 style="color: #92400e; font-size: 14px; margin: 0 0 8px 0;">Pickup Location</h3>
          <p style="color: #78350f; margin: 0; font-weight: 500;">LatinLite Cantina</p>
          <p style="color: #92400e; margin: 4px 0 0 0; font-size: 14px;">We'll have your order ready for pickup!</p>
        </div>
      `;
    } else if (order.address) {
      deliveryInfoHtml = `
        <div style="background: #dbeafe; padding: 16px; border-radius: 8px; margin-top: 20px;">
          <h3 style="color: #1e40af; font-size: 14px; margin: 0 0 8px 0;">Delivery Address</h3>
          <p style="color: #1e3a8a; margin: 0; font-weight: 500;">
            ${order.address.street}${order.address.unit ? `, ${order.address.unit}` : ""}
          </p>
          <p style="color: #1e3a8a; margin: 4px 0 0 0;">
            ${order.address.city}, ${order.address.state} ${order.address.zipCode}
          </p>
          ${order.address.deliveryNotes ? `<p style="color: #3b82f6; margin: 8px 0 0 0; font-size: 13px; font-style: italic;">Note: ${order.address.deliveryNotes}</p>` : ""}
        </div>
      `;
    }

    // Build order items summary for email
    const orderItemsSummary = order.orderDays.map((day) => {
      const dayName = DAY_NAMES[day.dayOfWeek] || `Day ${day.dayOfWeek}`;
      const items = (day.orderItems as OrderItem[]).map((item) => ({
        name: item.menuItem.name,
        quantity: item.quantity,
        isCompleta: item.isCompleta,
      }));
      return { dayName, items };
    });

    // Build delivery info
    let deliveryInfo = "";
    if (order.isPickup) {
      deliveryInfo = "Pickup at LatinLite Cantina";
    } else if (order.address) {
      deliveryInfo = `${order.address.street}${order.address.unit ? `, ${order.address.unit}` : ""}, ${order.address.city}, ${order.address.state} ${order.address.zipCode}`;
    }

    const transactionalId = process.env.LOOPS_ORDER_CONFIRMATION_ID;

    console.log(`[Order Email] Sending confirmation for order ${order.orderNumber} to ${order.customer.user.email}`);
    console.log(`[Order Email] LOOPS_API_KEY set: ${!!process.env.LOOPS_API_KEY}`);
    console.log(`[Order Email] Transactional ID: ${transactionalId}`);

    if (!transactionalId) {
      console.error("[Order Email] LOOPS_ORDER_CONFIRMATION_ID is not set");
      return { success: false, error: "Transactional email ID not configured" };
    }

    if (!process.env.LOOPS_API_KEY) {
      console.error("[Order Email] LOOPS_API_KEY is not set");
      return { success: false, error: "Loops API key not configured" };
    }

    const result = await loops.sendTransactionalEmail({
      transactionalId,
      email: order.customer.user.email,
      dataVariables: {
        firstName: customerName,
        orderNumber: order.orderNumber,
        orderDate: formatFullDate(order.createdAt),
        weekOf: formatFullDate(order.weeklyMenu.weekStartDate),
        orderType: order.isPickup ? "Pickup" : "Delivery",
        subtotal: formatCurrency(order.subtotal),
        deliveryFee: formatCurrency(order.deliveryFee),
        totalAmount: formatCurrency(order.totalAmount),
        deliveryInfo,
        orderItemsHtml,
        orderItemsSummary: JSON.stringify(orderItemsSummary),
      },
    });

    console.log("[Order Email] Loops API response:", JSON.stringify(result));

    if (!result.success) {
      console.error("[Order Email] Loops API returned error:", result);
      return { success: false, error: "Failed to send email via Loops" };
    }

    console.log(`[Order Email] Successfully sent confirmation for order ${order.orderNumber}`);
    return { success: true };
  } catch (error) {
    console.error("[Order Email] Error sending order confirmation email:", error);
    return { success: false, error: String(error) };
  }
}
