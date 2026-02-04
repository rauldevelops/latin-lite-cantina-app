import { resend } from "@/lib/resend";
import { prisma } from "@/lib/prisma";

const DAY_NAMES = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatCurrency(amount: any): string {
  const num = Number(amount);
  return `$${num.toFixed(2)}`;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
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

    html += `
      <div style="margin-bottom: 20px;">
        <h3 style="color: #16a34a; font-size: 16px; margin: 0 0 10px 0; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">
          ${dayName}
        </h3>
    `;

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

      html += `
        <div style="background: #f9fafb; padding: 12px; border-radius: 6px; margin-bottom: 8px;">
          <div style="font-weight: 600; color: #374151; margin-bottom: 4px;">
            Completa ${completaIndex}
          </div>
          <div style="color: #4b5563; font-size: 14px;">
            <strong>Entree:</strong> ${entree?.menuItem.name || "Unknown"}
          </div>
          <div style="color: #4b5563; font-size: 14px;">
            <strong>Sides:</strong> ${sides.map((s) => s.menuItem.name).join(", ") || "None"}
          </div>
        </div>
      `;
      completaIndex++;
    }

    // Render extras
    if (extras.length > 0) {
      html += `<div style="margin-top: 8px;">`;
      for (const item of extras) {
        html += `
          <div style="color: #4b5563; font-size: 14px; padding: 4px 0;">
            ${item.quantity > 1 ? `${item.quantity}x ` : ""}${item.menuItem.name}
            <span style="color: #6b7280;">(Extra - ${formatCurrency(item.unitPrice)}${item.quantity > 1 ? " each" : ""})</span>
          </div>
        `;
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
          <p style="color: #78350f; margin: 0; font-weight: 500;">Latin Lite Cantina</p>
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

    const fromEmail = process.env.RESEND_FROM_EMAIL || "Latin Lite Cantina <onboarding@resend.dev>";

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f3f4f6;">
          <div style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Latin Lite Cantina</h1>
            <p style="color: #bbf7d0; margin: 8px 0 0 0; font-size: 14px;">Order Confirmation</p>
          </div>

          <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
            <p style="margin-top: 0; font-size: 18px;">Hi ${customerName},</p>
            <p style="color: #16a34a; font-weight: 600; font-size: 16px;">Your order has been confirmed!</p>

            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 16px; border-radius: 8px; margin: 20px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="color: #6b7280; font-size: 13px; padding: 4px 0;">Order Number</td>
                  <td style="color: #111827; font-weight: 600; text-align: right; padding: 4px 0;">${order.orderNumber}</td>
                </tr>
                <tr>
                  <td style="color: #6b7280; font-size: 13px; padding: 4px 0;">Order Date</td>
                  <td style="color: #111827; text-align: right; padding: 4px 0;">${formatDate(order.createdAt)}</td>
                </tr>
                <tr>
                  <td style="color: #6b7280; font-size: 13px; padding: 4px 0;">Week Of</td>
                  <td style="color: #111827; text-align: right; padding: 4px 0;">${formatDate(order.weeklyMenu.weekStartDate)}</td>
                </tr>
                <tr>
                  <td style="color: #6b7280; font-size: 13px; padding: 4px 0;">Type</td>
                  <td style="color: #111827; text-align: right; padding: 4px 0;">${order.isPickup ? "Pickup" : "Delivery"}</td>
                </tr>
              </table>
            </div>

            <h2 style="color: #111827; font-size: 18px; margin: 24px 0 16px 0; border-bottom: 2px solid #16a34a; padding-bottom: 8px;">
              Your Order
            </h2>

            ${orderItemsHtml}

            <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin-top: 24px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="color: #6b7280; padding: 6px 0;">Subtotal</td>
                  <td style="color: #374151; text-align: right; padding: 6px 0;">${formatCurrency(order.subtotal)}</td>
                </tr>
                ${Number(order.deliveryFee) > 0 ? `
                <tr>
                  <td style="color: #6b7280; padding: 6px 0;">Delivery Fee</td>
                  <td style="color: #374151; text-align: right; padding: 6px 0;">${formatCurrency(order.deliveryFee)}</td>
                </tr>
                ` : ""}
                <tr style="border-top: 2px solid #e5e7eb;">
                  <td style="color: #111827; font-weight: 700; padding: 12px 0 6px 0; font-size: 16px;">Total</td>
                  <td style="color: #16a34a; font-weight: 700; text-align: right; padding: 12px 0 6px 0; font-size: 18px;">${formatCurrency(order.totalAmount)}</td>
                </tr>
              </table>
            </div>

            ${deliveryInfoHtml}

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">

            <p style="color: #6b7280; font-size: 14px; margin-bottom: 0;">
              Thank you for your order! If you have any questions, please don't hesitate to contact us.
            </p>
          </div>

          <div style="background: #f9fafb; padding: 20px; text-align: center; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">Latin Lite Cantina - Fresh Latin-inspired meals delivered to your door</p>
          </div>
        </body>
      </html>
    `;

    const result = await resend.emails.send({
      from: fromEmail,
      to: order.customer.user.email,
      subject: `Order Confirmed - ${order.orderNumber}`,
      html: emailHtml,
    });

    console.log("Order confirmation email sent:", result);

    if (result.error) {
      console.error("Resend error:", result.error);
      return { success: false, error: result.error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Error sending order confirmation email:", error);
    return { success: false, error: String(error) };
  }
}
