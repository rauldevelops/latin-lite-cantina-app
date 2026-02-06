"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
  createdAt: string;
  customer: { firstName: string; lastName: string; email: string | null };
  _count: { orderDays: number };
};

const STATUSES = [
  "ALL",
  "PENDING",
  "CONFIRMED",
  "DELIVERED",
  "CANCELLED",
];

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
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

export default function AdminOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, fromDate, toDate]);

  async function fetchOrders() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (search) params.set("search", search);
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);

      const res = await fetch(`/api/admin/orders?${params}`);

      if (!res.ok) {
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        throw new Error("Failed to fetch");
      }

      const data = await res.json();
      setOrders(data);
    } catch (err) {
      setError(`Failed to load orders: ${err}`);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    fetchOrders();
  }

  if (loading && orders.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
          <div className="flex gap-2">
            <Link
              href="/admin/orders/create"
              className="px-6 py-2 bg-latin-red text-white rounded-full hover:bg-latin-orange uppercase font-semibold transition-colors"
            >
              Create Order
            </Link>
            <Link
              href="/admin/menu-items"
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 uppercase font-semibold transition-colors"
            >
              Menu Items
            </Link>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white shadow rounded-lg p-4 mb-6 space-y-4">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              placeholder="Search by order #, customer name, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-400"
            />
            <button
              type="submit"
              className="px-6 py-2 bg-latin-red text-white rounded-full hover:bg-latin-orange uppercase font-semibold transition-colors"
            >
              Search
            </button>
          </form>

          {/* Status tabs */}
          <div className="flex flex-wrap gap-1">
            {STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  statusFilter === s
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {formatStatus(s)}
              </button>
            ))}
          </div>

          {/* Date range */}
          <div className="flex gap-4 items-center">
            <label className="text-sm text-gray-600">From:</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-gray-900 text-sm"
            />
            <label className="text-sm text-gray-600">To:</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-gray-900 text-sm"
            />
            {(fromDate || toDate) && (
              <button
                onClick={() => {
                  setFromDate("");
                  setToDate("");
                }}
                className="text-sm text-red-600 hover:text-red-800 transition-colors"
              >
                Clear dates
              </button>
            )}
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white shadow rounded-lg overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Order #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Days
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Payment
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                    No orders found.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/admin/orders/${order.id}`)}
                  >
                    <td className="px-6 py-4 text-sm font-mono text-latin-red">
                      {order.orderNumber}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {order.customer.firstName} {order.customer.lastName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {order._count.orderDays}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {order.isPickup ? "Pickup" : "Delivery"}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      ${Number(order.totalAmount).toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          STATUS_COLORS[order.status] || "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {formatStatus(order.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          PAYMENT_COLORS[order.paymentStatus] || "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {formatStatus(order.paymentStatus)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
