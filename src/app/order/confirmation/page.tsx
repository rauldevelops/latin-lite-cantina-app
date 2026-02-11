"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type MenuItem = {
  id: string;
  name: string;
};

type OrderItem = {
  id: string;
  menuItem: MenuItem;
  quantity: number;
};

type OrderDay = {
  id: string;
  dayOfWeek: number;
  orderItems: OrderItem[];
};

type Address = {
  street: string;
  unit: string | null;
  city: string;
  state: string;
  zipCode: string;
};

type Order = {
  id: string;
  orderNumber: string;
  subtotal: number;
  deliveryFee: number;
  discountAmount: number | null;
  promoCode: string | null;
  totalAmount: number;
  isPickup: boolean;
  paymentMethod: string | null;
  paymentStatus: string;
  address: Address | null;
  status: string;
  createdAt: string;
  orderDays: OrderDay[];
};

const DAYS = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

function OrderConfirmationContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("id");
  const redirectStatus = searchParams.get("redirect_status");
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchOrder = useCallback(async () => {
    if (!orderId) {
      setError("No order ID provided");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/orders/${orderId}`);

      if (!res.ok) {
        throw new Error("Order not found");
      }

      const data = await res.json();
      setOrder(data);
    } catch (err) {
      setError(`Failed to load order: ${err}`);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();

    // If redirected from Stripe and payment succeeded, poll for updated status
    // The webhook should update the order, but we poll to ensure UI updates
    if (redirectStatus === "succeeded") {
      const pollInterval = setInterval(async () => {
        try {
          const res = await fetch(`/api/orders/${orderId}`);
          if (res.ok) {
            const data = await res.json();
            setOrder(data);
            // Stop polling once payment is confirmed
            if (data.paymentStatus === "PAID") {
              clearInterval(pollInterval);
            }
          }
        } catch {
          // Ignore polling errors
        }
      }, 2000); // Poll every 2 seconds

      // Stop polling after 30 seconds
      setTimeout(() => clearInterval(pollInterval), 30000);

      return () => clearInterval(pollInterval);
    }
  }, [orderId, redirectStatus, fetchOrder]);

  function getPaymentStatusDisplay() {
    if (!order) return null;

    // If we were redirected with succeeded status but order still shows PENDING,
    // it means the webhook hasn't processed yet
    if (redirectStatus === "succeeded" && order.paymentStatus === "PENDING") {
      return {
        text: "Processing payment...",
        className: "text-blue-700 font-medium",
      };
    }

    switch (order.paymentStatus) {
      case "PAID":
        return {
          text: "Paid",
          className: "text-green-700 font-medium",
        };
      case "FAILED":
        return {
          text: "Payment failed",
          className: "text-red-700 font-medium",
        };
      case "CREDIT_ACCOUNT":
        return {
          text: "Credit account",
          className: "text-blue-700 font-medium",
        };
      case "PENDING":
      default:
        return {
          text: "Payment pending",
          className: "text-yellow-700 font-medium",
        };
    }
  }

  function getHeaderDisplay() {
    if (!order) return { icon: "✓", title: "Order Confirmed!", color: "text-green-500" };

    // Check for failed redirect status from Stripe
    if (redirectStatus === "failed") {
      return {
        icon: "!",
        title: "Payment Failed",
        color: "text-red-500",
      };
    }

    if (order.paymentStatus === "PAID") {
      return {
        icon: "✓",
        title: "Order Confirmed!",
        color: "text-green-500",
      };
    }

    if (order.paymentStatus === "FAILED") {
      return {
        icon: "!",
        title: "Payment Failed",
        color: "text-red-500",
      };
    }

    // Pending or processing
    return {
      icon: "✓",
      title: "Order Received!",
      color: "text-green-500",
    };
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading order...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">{error || "Order not found"}</p>
          <Link href="/order" className="text-latin-red hover:text-latin-orange transition-colors">
            &larr; Back to Order
          </Link>
        </div>
      </div>
    );
  }

  const paymentStatus = getPaymentStatusDisplay();
  const headerDisplay = getHeaderDisplay();

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className={`text-6xl mb-4 ${headerDisplay.color}`}>
            {headerDisplay.icon}
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {headerDisplay.title}
          </h1>
          <p className="text-gray-600 mb-6">
            {order.paymentStatus === "PAID" || redirectStatus === "succeeded"
              ? "Thank you for your order. We'll have your meals ready!"
              : order.paymentStatus === "FAILED" || redirectStatus === "failed"
              ? "There was a problem with your payment. Please try again."
              : "Thank you for your order. We'll have your meals ready!"}
          </p>

          {(order.paymentStatus === "FAILED" || redirectStatus === "failed") && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800 text-sm">
                Your order has been saved but payment was not completed.
                Please contact us or try placing a new order.
              </p>
            </div>
          )}

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-500">Order Number</p>
            <p className="text-2xl font-mono font-bold text-gray-900">
              {order.orderNumber}
            </p>
          </div>

          {/* Delivery / Pickup Info */}
          <div className="text-left border-t pt-6 mb-6">
            <h2 className="font-semibold text-gray-900 mb-2">
              {order.isPickup ? "Pickup" : "Delivery"}
            </h2>
            {order.isPickup ? (
              <p className="text-sm text-gray-600">Pickup at LatinLite Cantina</p>
            ) : order.address ? (
              <div className="text-sm text-gray-600">
                <p>{order.address.street}{order.address.unit ? `, ${order.address.unit}` : ""}</p>
                <p>{order.address.city}, {order.address.state} {order.address.zipCode}</p>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Delivery address not available</p>
            )}
          </div>

          {/* Payment Info */}
          <div className="text-left border-t pt-6 mb-6">
            <h2 className="font-semibold text-gray-900 mb-2">Payment</h2>
            <p className="text-sm text-gray-600">
              {order.paymentMethod === "CARD"
                ? "Credit / Debit Card"
                : order.paymentMethod === "CREDIT_ACCOUNT"
                ? "Credit Account"
                : order.paymentMethod || "N/A"}
              {" — "}
              <span className={paymentStatus?.className}>
                {paymentStatus?.text}
              </span>
            </p>
          </div>

          {/* Order Details */}
          <div className="text-left border-t pt-6">
            <h2 className="font-semibold text-gray-900 mb-4">Order Details</h2>
            {order.orderDays
              .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
              .map((day) => (
                <div key={day.id} className="mb-4 pb-4 border-b last:border-0">
                  <p className="font-medium text-gray-900">
                    {DAYS[day.dayOfWeek]}
                  </p>
                  <ul className="text-sm text-gray-600 mt-1">
                    {day.orderItems.map((item) => (
                      <li key={item.id}>
                        &bull; {item.quantity > 1 ? `${item.quantity}x ` : ""}
                        {item.menuItem.name}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

            <div className="space-y-1 mt-4 pt-4 border-t text-sm text-gray-600">
              {order.discountAmount && Number(order.discountAmount) > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount{order.promoCode ? ` (${order.promoCode})` : ""}</span>
                  <span>-${Number(order.discountAmount).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-semibold text-gray-900 pt-2 border-t">
                <span>Total</span>
                <span>${Number(order.totalAmount).toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="mt-8 space-y-3">
            <Link
              href="/order"
              className="block w-full bg-latin-red text-white py-3 rounded-full font-semibold uppercase hover:bg-latin-orange transition-colors"
            >
              PLACE ANOTHER ORDER
            </Link>
            <Link
              href="/menu"
              className="block w-full bg-gray-100 text-gray-700 py-3 rounded-full font-semibold uppercase hover:bg-gray-200 transition-colors"
            >
              VIEW MENU
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OrderConfirmationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow p-8">
            <div className="animate-pulse space-y-4">
              <div className="h-16 w-16 bg-gray-200 rounded-full mx-auto"></div>
              <div className="h-8 bg-gray-200 rounded w-48 mx-auto"></div>
              <div className="h-4 bg-gray-200 rounded w-64 mx-auto"></div>
            </div>
          </div>
        </div>
      </div>
    }>
      <OrderConfirmationContent />
    </Suspense>
  );
}
