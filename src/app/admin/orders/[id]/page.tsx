"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

type MenuItem = { id: string; name: string; type: string };

type OrderItem = {
  id: string;
  menuItem: MenuItem;
  quantity: number;
  unitPrice: number;
  isCompleta: boolean;
  completaGroupId: string | null;
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
  deliveryNotes: string | null;
};

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string | null;
  isPickup: boolean;
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  notes: string | null;
  createdAt: string;
  customer: {
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
  };
  address: Address | null;
  weeklyMenu: { weekStartDate: string };
  orderDays: OrderDay[];
};

const DAYS = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
];

const PAYMENT_STATUSES = ["PENDING", "PAID", "FAILED", "REFUNDED", "CREDIT_ACCOUNT"];

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  PREPARING: "bg-purple-100 text-purple-800",
  OUT_FOR_DELIVERY: "bg-indigo-100 text-indigo-800",
  DELIVERED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
};

const PAYMENT_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  PAID: "bg-green-100 text-green-800",
  FAILED: "bg-red-100 text-red-800",
  REFUNDED: "bg-gray-100 text-gray-800",
  CREDIT_ACCOUNT: "bg-blue-100 text-blue-800",
};

function formatStatus(s: string) {
  return s.replace(/_/g, " ");
}

export default function AdminOrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Editable fields
  const [editStatus, setEditStatus] = useState("");
  const [editPaymentStatus, setEditPaymentStatus] = useState("");
  const [editNotes, setEditNotes] = useState("");

  useEffect(() => {
    async function fetchOrder() {
      const id = await params.id;
      try {
        const res = await fetch(`/api/admin/orders/${id}`);

        if (!res.ok) {
          if (res.status === 401) {
            router.push("/login");
            return;
          }
          throw new Error("Failed to fetch order");
        }

        const data = await res.json();
        setOrder(data);
        setEditStatus(data.status);
        setEditPaymentStatus(data.paymentStatus);
        setEditNotes(data.notes || "");
      } catch (err) {
        setError(`Failed to load order: ${err}`);
      } finally {
        setLoading(false);
      }
    }

    fetchOrder();
  }, [params, router]);

  async function handleSave() {
    if (!order) return;
    setSaving(true);
    setError("");

    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: editStatus,
          paymentStatus: editPaymentStatus,
          notes: editNotes || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update");
      }

      const updated = await res.json();
      setOrder({
        ...order,
        status: updated.status,
        paymentStatus: updated.paymentStatus,
        notes: updated.notes,
      });
    } catch (err) {
      setError(`Failed to update order: ${err}`);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">{error || "Order not found"}</p>
      </div>
    );
  }

  // Group order items by completa
  function renderDayItems(orderDay: OrderDay) {
    const completas: Record<string, OrderItem[]> = {};
    const extras: OrderItem[] = [];

    for (const item of orderDay.orderItems) {
      if (item.isCompleta && item.completaGroupId) {
        if (!completas[item.completaGroupId]) completas[item.completaGroupId] = [];
        completas[item.completaGroupId].push(item);
      } else {
        extras.push(item);
      }
    }

    return (
      <div>
        {Object.entries(completas).map(([groupId, items], i) => {
          const entree = items.find((it) => it.menuItem.type === "ENTREE");
          const sides = items.filter((it) => it.menuItem.type === "SIDE");
          return (
            <div key={groupId} className="mb-2">
              <p className="text-sm font-medium text-gray-700">
                Completa #{i + 1}
              </p>
              {entree && (
                <p className="text-sm text-gray-600 ml-3">
                  {entree.menuItem.name}
                </p>
              )}
              {sides.map((s) => (
                <p key={s.id} className="text-sm text-gray-500 ml-3">
                  + {s.quantity > 1 ? `${s.quantity}x ` : ""}
                  {s.menuItem.name}
                </p>
              ))}
            </div>
          );
        })}
        {extras.map((item) => (
          <p key={item.id} className="text-sm text-blue-600 ml-1">
            Extra: {item.quantity > 1 ? `${item.quantity}x ` : ""}
            {item.menuItem.name} (${Number(item.unitPrice).toFixed(2)} ea)
          </p>
        ))}
      </div>
    );
  }

  const hasChanges =
    editStatus !== order.status ||
    editPaymentStatus !== order.paymentStatus ||
    (editNotes || null) !== order.notes;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <Link
            href="/admin/orders"
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            ← Back to Orders
          </Link>
        </div>

        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 font-mono">
            {order.orderNumber}
          </h1>
          <span
            className={`px-3 py-1 text-sm rounded-full ${
              STATUS_COLORS[order.status] || "bg-gray-100"
            }`}
          >
            {formatStatus(order.status)}
          </span>
          <span
            className={`px-3 py-1 text-sm rounded-full ${
              PAYMENT_COLORS[order.paymentStatus] || "bg-gray-100"
            }`}
          >
            {formatStatus(order.paymentStatus)}
          </span>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Info + Actions */}
          <div className="space-y-6">
            {/* Customer */}
            <div className="bg-white shadow rounded-lg p-4">
              <h2 className="font-semibold text-gray-900 mb-2">Customer</h2>
              <p className="text-sm text-gray-900">
                {order.customer.firstName} {order.customer.lastName}
              </p>
              {order.customer.email && (
                <p className="text-sm text-gray-600">{order.customer.email}</p>
              )}
              {order.customer.phone && (
                <p className="text-sm text-gray-600">{order.customer.phone}</p>
              )}
            </div>

            {/* Delivery */}
            <div className="bg-white shadow rounded-lg p-4">
              <h2 className="font-semibold text-gray-900 mb-2">
                {order.isPickup ? "Pickup" : "Delivery"}
              </h2>
              {order.isPickup ? (
                <p className="text-sm text-gray-600">
                  Pickup at Latin Lite Cantina
                </p>
              ) : order.address ? (
                <div className="text-sm text-gray-600">
                  <p>
                    {order.address.street}
                    {order.address.unit ? `, ${order.address.unit}` : ""}
                  </p>
                  <p>
                    {order.address.city}, {order.address.state}{" "}
                    {order.address.zipCode}
                  </p>
                  {order.address.deliveryNotes && (
                    <p className="text-gray-500 mt-1">
                      Note: {order.address.deliveryNotes}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No address on file</p>
              )}
            </div>

            {/* Payment */}
            <div className="bg-white shadow rounded-lg p-4">
              <h2 className="font-semibold text-gray-900 mb-2">Payment</h2>
              <p className="text-sm text-gray-600">
                Method:{" "}
                {order.paymentMethod
                  ? formatStatus(order.paymentMethod)
                  : "N/A"}
              </p>
            </div>

            {/* Pricing */}
            <div className="bg-white shadow rounded-lg p-4">
              <h2 className="font-semibold text-gray-900 mb-2">Pricing</h2>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>${Number(order.subtotal).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Delivery Fee</span>
                  <span>
                    {order.isPickup
                      ? "FREE"
                      : `$${Number(order.deliveryFee).toFixed(2)}`}
                  </span>
                </div>
                <div className="flex justify-between font-semibold text-gray-900 pt-1 border-t">
                  <span>Total</span>
                  <span>${Number(order.totalAmount).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white shadow rounded-lg p-4 space-y-3">
              <h2 className="font-semibold text-gray-900 mb-2">
                Update Order
              </h2>

              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Order Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 text-sm"
                >
                  {ORDER_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {formatStatus(s)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Payment Status
                </label>
                <select
                  value={editPaymentStatus}
                  onChange={(e) => setEditPaymentStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 text-sm"
                >
                  {PAYMENT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {formatStatus(s)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Notes
                </label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 text-sm"
                  placeholder="Internal notes..."
                />
              </div>

              <button
                onClick={handleSave}
                disabled={saving || !hasChanges}
                className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>

          {/* Right: Order Items */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-semibold text-gray-900">Order Items</h2>
                <p className="text-sm text-gray-500">
                  Week of{" "}
                  {new Date(order.weeklyMenu.weekStartDate).toLocaleDateString(
                    "en-US",
                    { month: "short", day: "numeric", year: "numeric" }
                  )}
                </p>
              </div>

              <div className="space-y-4">
                {order.orderDays.map((day) => (
                  <div
                    key={day.id}
                    className="border border-gray-200 rounded-lg p-3"
                  >
                    <p className="font-medium text-gray-900 mb-2">
                      {DAYS[day.dayOfWeek]}
                    </p>
                    {renderDayItems(day)}
                  </div>
                ))}
              </div>
            </div>

            {/* Meta */}
            <div className="mt-4 text-sm text-gray-500">
              <p>
                Created:{" "}
                {new Date(order.createdAt).toLocaleString("en-US", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
