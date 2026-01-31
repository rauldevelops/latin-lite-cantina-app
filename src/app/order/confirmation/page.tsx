"use client";

import { useEffect, useState } from "react";
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

export default function OrderConfirmationPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("id");
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchOrder() {
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
    }

    fetchOrder();
  }, [orderId]);

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
          <Link href="/order" className="text-blue-600 hover:text-blue-800">
            ← Back to Order
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="text-green-500 text-6xl mb-4">✓</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Order Confirmed!
          </h1>
          <p className="text-gray-600 mb-6">
            Thank you for your order. We&apos;ll have your meals ready!
          </p>

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
              <p className="text-sm text-gray-600">Pickup at Latin Lite Cantina</p>
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
              {order.paymentMethod === "CARD" ? "Credit / Debit Card" : order.paymentMethod || "N/A"}
              {" — "}
              <span className="text-yellow-700 font-medium">Payment pending</span>
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
                      <li key={item.id}>• {item.quantity > 1 ? `${item.quantity}x ` : ""}{item.menuItem.name}</li>
                    ))}
                  </ul>
                </div>
              ))}

            <div className="space-y-1 mt-4 pt-4 border-t text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>${Number(order.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Fee</span>
                <span>{order.isPickup ? "FREE" : `$${Number(order.deliveryFee).toFixed(2)}`}</span>
              </div>
              <div className="flex justify-between text-lg font-semibold text-gray-900 pt-2 border-t">
                <span>Total</span>
                <span>${Number(order.totalAmount).toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="mt-8 space-y-3">
            <Link
              href="/order"
              className="block w-full bg-green-600 text-white py-3 rounded-md font-medium hover:bg-green-700"
            >
              Place Another Order
            </Link>
            <Link
              href="/menu"
              className="block w-full bg-gray-100 text-gray-700 py-3 rounded-md font-medium hover:bg-gray-200"
            >
              View Menu
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}