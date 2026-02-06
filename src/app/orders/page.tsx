"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  isPickup: boolean;
  subtotal: string;
  deliveryFee: string;
  totalAmount: string;
  createdAt: string;
  weeklyMenu: {
    weekStartDate: string;
  };
  orderDays: {
    dayOfWeek: number;
    orderItems: {
      id: string;
      quantity: number;
      isCompleta: boolean;
    }[];
  }[];
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  PREPARING: "bg-purple-100 text-purple-800",
  OUT_FOR_DELIVERY: "bg-indigo-100 text-indigo-800",
  DELIVERED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  PAID: "bg-green-100 text-green-800",
  FAILED: "bg-red-100 text-red-800",
  REFUNDED: "bg-gray-100 text-gray-800",
  CREDIT_ACCOUNT: "bg-blue-100 text-blue-800",
};

const DAY_NAMES = ["", "Mon", "Tue", "Wed", "Thu", "Fri"];

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatCurrency(amount: string | number): string {
  return `$${Number(amount).toFixed(2)}`;
}

function getOrderDaysSummary(orderDays: Order["orderDays"]): string {
  const days = orderDays.map((d) => DAY_NAMES[d.dayOfWeek]).filter(Boolean);
  return days.join(", ");
}

function countMeals(orderDays: Order["orderDays"]): number {
  return orderDays.reduce((total, day) => {
    const completas = day.orderItems.filter((item) => item.isCompleta && item.quantity > 0);
    const uniqueCompletas = new Set(completas.map((item) => item.id.split("-")[0]));
    return total + uniqueCompletas.size;
  }, 0);
}

export default function OrdersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    async function fetchOrders() {
      try {
        const response = await fetch("/api/orders");
        if (!response.ok) {
          throw new Error("Failed to fetch orders");
        }
        const data = await response.json();
        setOrders(data);
      } catch (err) {
        setError("Failed to load orders");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    if (session) {
      fetchOrders();
    }
  }, [session]);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-48 mb-8"></div>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
          <Link
            href="/order"
            className="px-4 py-2 bg-latin-orange text-white text-sm font-semibold rounded-full hover:bg-latin-red uppercase transition-colors"
          >
            Place New Order
          </Link>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {orders.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="text-gray-400 text-5xl mb-4">📦</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No orders yet</h2>
            <p className="text-gray-600 mb-6">
              You haven&apos;t placed any orders yet. Start your first order today!
            </p>
            <Link
              href="/order"
              className="inline-block px-6 py-3 bg-latin-orange text-white font-semibold rounded-full hover:bg-latin-red uppercase transition-colors"
            >
              BROWSE MENU & ORDER
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="block bg-white rounded-lg shadow hover:shadow-md transition-all"
              >
                <div className="p-6">
                  <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-semibold text-gray-900">
                          {order.orderNumber}
                        </span>
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                            STATUS_COLORS[order.status] || "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {order.status.replace(/_/g, " ")}
                        </span>
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                            PAYMENT_STATUS_COLORS[order.paymentStatus] || "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {order.paymentStatus.replace(/_/g, " ")}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        Ordered on {formatDate(order.createdAt)}
                      </p>
                      <p className="text-sm font-medium text-latin-orange mt-1">
                        Week of {formatDate(order.weeklyMenu.weekStartDate)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-gray-900">
                        {formatCurrency(order.totalAmount)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {order.isPickup ? "Pickup" : "Delivery"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <span className="text-gray-400">Days:</span>
                      <span>{getOrderDaysSummary(order.orderDays)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-gray-400">Items:</span>
                      <span>{order.orderDays.reduce((sum, d) => sum + d.orderItems.length, 0)} items</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
                    <span className="text-sm text-latin-orange font-medium transition-colors">
                      View Details →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
