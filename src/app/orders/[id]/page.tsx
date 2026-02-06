"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

type OrderItem = {
  id: string;
  quantity: number;
  unitPrice: string;
  isCompleta: boolean;
  completaGroupId: string | null;
  menuItem: {
    name: string;
    type: string;
  };
};

type OrderDay = {
  id: string;
  dayOfWeek: number;
  orderItems: OrderItem[];
};

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  isPickup: boolean;
  subtotal: string;
  deliveryFee: string;
  totalAmount: string;
  notes: string | null;
  createdAt: string;
  weeklyMenu: {
    weekStartDate: string;
  };
  address: {
    street: string;
    unit: string | null;
    city: string;
    state: string;
    zipCode: string;
    deliveryNotes: string | null;
  } | null;
  orderDays: OrderDay[];
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  CONFIRMED: "bg-blue-100 text-blue-800 border-blue-200",
  PREPARING: "bg-purple-100 text-purple-800 border-purple-200",
  OUT_FOR_DELIVERY: "bg-indigo-100 text-indigo-800 border-indigo-200",
  DELIVERED: "bg-green-100 text-green-800 border-green-200",
  CANCELLED: "bg-red-100 text-red-800 border-red-200",
};

const STATUS_DESCRIPTIONS: Record<string, string> = {
  PENDING: "Your order is awaiting payment confirmation.",
  CONFIRMED: "Your order has been confirmed and is scheduled for preparation.",
  PREPARING: "Your order is being prepared in the kitchen.",
  OUT_FOR_DELIVERY: "Your order is on its way!",
  DELIVERED: "Your order has been delivered.",
  CANCELLED: "This order has been cancelled.",
};

const DAY_NAMES = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatCurrency(amount: string | number): string {
  return `$${Number(amount).toFixed(2)}`;
}

function groupItemsByCompleta(orderItems: OrderItem[]) {
  const completas: Map<string, OrderItem[]> = new Map();
  const extras: OrderItem[] = [];

  for (const item of orderItems) {
    if (item.isCompleta && item.completaGroupId) {
      const existing = completas.get(item.completaGroupId) || [];
      existing.push(item);
      completas.set(item.completaGroupId, existing);
    } else if (!item.isCompleta) {
      extras.push(item);
    }
  }

  return { completas, extras };
}

export default function OrderDetailPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.push("/login");
    }
  }, [sessionStatus, router]);

  useEffect(() => {
    async function fetchOrder() {
      try {
        const response = await fetch(`/api/orders/${orderId}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError("Order not found");
          } else {
            throw new Error("Failed to fetch order");
          }
          return;
        }
        const data = await response.json();
        setOrder(data);
      } catch (err) {
        setError("Failed to load order");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    if (session && orderId) {
      fetchOrder();
    }
  }, [session, orderId]);

  if (sessionStatus === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-3xl mx-auto px-4">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-64 mb-8"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-3xl mx-auto px-4">
          <Link href="/orders" className="text-latin-red hover:text-latin-orange transition-colors mb-4 inline-block">
            ← Back to Orders
          </Link>
          <div className="bg-red-100 text-red-700 p-6 rounded-lg">
            <h2 className="text-lg font-semibold mb-2">Error</h2>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <Link href="/orders" className="text-green-600 hover:text-green-700 mb-4 inline-block">
          ← Back to Orders
        </Link>

        {/* Order Header */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6">
            <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">
                  Order {order.orderNumber}
                </h1>
                <p className="text-gray-500">
                  Placed on {formatDate(order.createdAt)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(order.totalAmount)}
                </p>
              </div>
            </div>

            {/* Status Banner */}
            <div
              className={`p-4 rounded-lg border ${
                STATUS_COLORS[order.status] || "bg-gray-100 text-gray-800 border-gray-200"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-semibold">
                  {order.status.replace(/_/g, " ")}
                </span>
              </div>
              <p className="text-sm mt-1 opacity-80">
                {STATUS_DESCRIPTIONS[order.status] || ""}
              </p>
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Week of:</span>
                <p className="font-medium text-gray-900">
                  {formatDate(order.weeklyMenu.weekStartDate)}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Delivery Type:</span>
                <p className="font-medium text-gray-900">
                  {order.isPickup ? "Pickup" : "Delivery"}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Payment Method:</span>
                <p className="font-medium text-gray-900">
                  {order.paymentMethod?.replace(/_/g, " ") || "Card"}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Payment Status:</span>
                <p className="font-medium text-gray-900">
                  {order.paymentStatus.replace(/_/g, " ")}
                </p>
              </div>
            </div>

            {/* Delivery Address */}
            {!order.isPickup && order.address && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <span className="text-gray-500 text-sm">Delivery Address:</span>
                <p className="font-medium text-gray-900">
                  {order.address.street}
                  {order.address.unit && `, ${order.address.unit}`}
                </p>
                <p className="text-gray-600">
                  {order.address.city}, {order.address.state} {order.address.zipCode}
                </p>
                {order.address.deliveryNotes && (
                  <p className="text-sm text-gray-500 mt-1 italic">
                    Note: {order.address.deliveryNotes}
                  </p>
                )}
              </div>
            )}

            {order.isPickup && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <span className="text-gray-500 text-sm">Pickup Location:</span>
                <p className="font-medium text-gray-900">Latin Lite Cantina</p>
              </div>
            )}
          </div>
        </div>

        {/* Order Items by Day */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Details</h2>

            <div className="space-y-6">
              {order.orderDays
                .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
                .map((day) => {
                  const { completas, extras } = groupItemsByCompleta(day.orderItems);

                  return (
                    <div key={day.id} className="border-b border-gray-100 pb-6 last:border-0 last:pb-0">
                      <h3 className="font-semibold text-latin-red mb-3">
                        {DAY_NAMES[day.dayOfWeek]}
                      </h3>

                      {/* Completas */}
                      {Array.from(completas.entries()).map(([groupId, items], index) => {
                        const entree = items.find((i) => Number(i.unitPrice) > 0);
                        const sides = items.filter((i) => Number(i.unitPrice) === 0);

                        return (
                          <div
                            key={groupId}
                            className="bg-gray-50 rounded-lg p-4 mb-3"
                          >
                            <div className="font-medium text-gray-900 mb-2">
                              Completa {index + 1}
                            </div>
                            <div className="text-sm text-gray-600 space-y-1">
                              <p>
                                <span className="text-gray-400">Entree:</span>{" "}
                                {entree?.menuItem.name || "Unknown"}
                              </p>
                              <p>
                                <span className="text-gray-400">Sides:</span>{" "}
                                {sides.map((s) => s.menuItem.name).join(", ") || "None"}
                              </p>
                            </div>
                          </div>
                        );
                      })}

                      {/* Extras */}
                      {extras.length > 0 && (
                        <div className="mt-3">
                          <div className="text-sm text-gray-500 mb-2">Extras:</div>
                          {extras.map((item) => (
                            <div
                              key={item.id}
                              className="flex justify-between text-sm py-1"
                            >
                              <span className="text-gray-700">
                                {item.quantity > 1 && `${item.quantity}x `}
                                {item.menuItem.name}
                              </span>
                              <span className="text-gray-500">
                                {formatCurrency(Number(item.unitPrice) * item.quantity)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        {/* Pricing Breakdown */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Details</h2>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="text-gray-900">{formatCurrency(order.subtotal)}</span>
              </div>
              {Number(order.deliveryFee) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Delivery Fee</span>
                  <span className="text-gray-900">{formatCurrency(order.deliveryFee)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-gray-200">
                <span className="font-semibold text-gray-900">Total</span>
                <span className="font-semibold text-latin-red text-lg">
                  {formatCurrency(order.totalAmount)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Order Notes */}
        {order.notes && (
          <div className="bg-white rounded-lg shadow mt-6">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Order Notes</h2>
              <p className="text-gray-600">{order.notes}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
