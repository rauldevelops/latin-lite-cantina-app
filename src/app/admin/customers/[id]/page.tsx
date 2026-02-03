"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { formatPhoneNumber } from "@/lib/formatPhone";

type DriverOption = {
  id: string;
  name: string;
};

type Address = {
  id: string;
  street: string;
  unit: string | null;
  city: string;
  state: string;
  zipCode: string;
  deliveryNotes: string | null;
  driverId: string | null;
  stopNumber: number | null;
  driver: DriverOption | null;
};

type EditableAddress = {
  id?: string;
  street: string;
  unit: string;
  city: string;
  state: string;
  zipCode: string;
  deliveryNotes: string;
  driverId: string;
  stopNumber: string;
  _delete?: boolean;
};

type OrderSummary = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  isPickup: boolean;
  totalAmount: number;
  createdAt: string;
};

type Customer = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  isCreditAccount: boolean;
  notes: string | null;
  createdAt: string;
  addresses: Address[];
  orders: OrderSummary[];
};

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

export default function AdminCustomerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editCredit, setEditCredit] = useState(false);
  const [editNotes, setEditNotes] = useState("");
  const [editAddresses, setEditAddresses] = useState<EditableAddress[]>([]);
  const [drivers, setDrivers] = useState<DriverOption[]>([]);

  useEffect(() => {
    fetch("/api/admin/drivers?activeOnly=true")
      .then((r) => r.json())
      .then((data) => setDrivers(data.map((d: DriverOption) => ({ id: d.id, name: d.name }))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    async function fetchCustomer() {
      const id = await params.id;
      try {
        const res = await fetch(`/api/admin/customers/${id}`);

        if (!res.ok) {
          if (res.status === 401) {
            router.push("/login");
            return;
          }
          throw new Error("Failed to fetch customer");
        }

        const data = await res.json();
        setCustomer(data);
        setEditEmail(data.email || "");
        setEditPhone(data.phone ? formatPhoneNumber(data.phone) : "");
        setEditCredit(data.isCreditAccount);
        setEditNotes(data.notes || "");
        setEditAddresses(
          data.addresses.map((a: Address) => ({
            id: a.id,
            street: a.street,
            unit: a.unit || "",
            city: a.city,
            state: a.state,
            zipCode: a.zipCode,
            deliveryNotes: a.deliveryNotes || "",
            driverId: a.driverId || "",
            stopNumber: a.stopNumber != null ? String(a.stopNumber) : "",
          }))
        );
      } catch (err) {
        setError(`Failed to load customer: ${err}`);
      } finally {
        setLoading(false);
      }
    }

    fetchCustomer();
  }, [params, router]);

  async function handleSave() {
    if (!customer) return;
    setSaving(true);
    setError("");

    try {
      const res = await fetch(`/api/admin/customers/${customer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: editEmail || null,
          phone: editPhone || null,
          isCreditAccount: editCredit,
          notes: editNotes || null,
          addresses: editAddresses,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update");
      }

      const updated = await res.json();
      setCustomer({
        ...customer,
        email: updated.email,
        phone: updated.phone,
        isCreditAccount: updated.isCreditAccount,
        notes: updated.notes,
        addresses: updated.addresses,
      });
      setEditAddresses(
        updated.addresses.map((a: Address) => ({
          id: a.id,
          street: a.street,
          unit: a.unit || "",
          city: a.city,
          state: a.state,
          zipCode: a.zipCode,
          deliveryNotes: a.deliveryNotes || "",
          driverId: a.driverId || "",
          stopNumber: a.stopNumber != null ? String(a.stopNumber) : "",
        }))
      );
    } catch (err) {
      setError(`Failed to update customer: ${err}`);
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

  if (!customer) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">{error || "Customer not found"}</p>
      </div>
    );
  }

  const addressesChanged = (() => {
    const visible = editAddresses.filter((a) => !a._delete);
    if (visible.length !== customer.addresses.length) return true;
    if (editAddresses.some((a) => a._delete)) return true;
    if (editAddresses.some((a) => !a.id)) return true;
    return customer.addresses.some((orig, i) => {
      const edit = visible[i];
      return (
        edit.street !== orig.street ||
        (edit.unit || null) !== orig.unit ||
        edit.city !== orig.city ||
        edit.state !== orig.state ||
        edit.zipCode !== orig.zipCode ||
        (edit.deliveryNotes || null) !== orig.deliveryNotes ||
        (edit.driverId || null) !== (orig.driverId || null) ||
        (edit.stopNumber ? Number(edit.stopNumber) : null) !== orig.stopNumber
      );
    });
  })();

  const hasChanges =
    (editEmail || null) !== customer.email ||
    (editPhone || null) !== customer.phone ||
    editCredit !== customer.isCreditAccount ||
    (editNotes || null) !== customer.notes ||
    addressesChanged;

  const totalSpent = customer.orders
    .filter((o) => o.status !== "CANCELLED")
    .reduce((sum, o) => sum + Number(o.totalAmount), 0);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <Link
            href="/admin/customers"
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            &larr; Back to Customers
          </Link>
        </div>

        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {customer.firstName} {customer.lastName}
          </h1>
          <Link
            href={`/admin/orders/create?customerId=${customer.id}`}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Create Order
          </Link>
          {customer.isCreditAccount && (
            <span className="px-3 py-1 text-sm rounded-full bg-blue-100 text-blue-800">
              Credit Account
            </span>
          )}
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Info + Edit */}
          <div className="space-y-6">
            {/* Contact */}
            <div className="bg-white shadow rounded-lg p-4">
              <h2 className="font-semibold text-gray-900 mb-2">Contact</h2>
              <p className="text-sm text-gray-600">
                {customer.email || "No email"}
              </p>
              <p className="text-sm text-gray-600">
                {customer.phone ? formatPhoneNumber(customer.phone) : "No phone"}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Joined {new Date(customer.createdAt).toLocaleDateString()}
              </p>
            </div>

            {/* Stats */}
            <div className="bg-white shadow rounded-lg p-4">
              <h2 className="font-semibold text-gray-900 mb-2">Stats</h2>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Total Orders</span>
                  <span>{customer.orders.length}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Total Spent</span>
                  <span>${totalSpent.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Edit */}
            <div className="bg-white shadow rounded-lg p-4 space-y-3">
              <h2 className="font-semibold text-gray-900 mb-2">
                Edit Customer
              </h2>

              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 text-sm"
                  placeholder="Email address..."
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Phone
                </label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(formatPhoneNumber(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 text-sm"
                  placeholder="Phone number..."
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={editCredit}
                  onChange={(e) => setEditCredit(e.target.checked)}
                  className="rounded border-gray-300"
                />
                Credit Account
              </label>

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

              {/* Addresses */}
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Addresses
                </label>
                <div className="space-y-3">
                  {editAddresses
                    .filter((a) => !a._delete)
                    .map((addr, idx) => {
                      const realIdx = editAddresses.indexOf(addr);
                      return (
                        <div
                          key={addr.id || `new-${idx}`}
                          className="border border-gray-200 rounded-md p-3 space-y-2"
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-medium text-gray-500">
                              Address {idx + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const next = [...editAddresses];
                                if (addr.id) {
                                  next[realIdx] = { ...addr, _delete: true };
                                } else {
                                  next.splice(realIdx, 1);
                                }
                                setEditAddresses(next);
                              }}
                              className="text-xs text-red-600 hover:text-red-800"
                            >
                              Remove
                            </button>
                          </div>
                          <input
                            type="text"
                            value={addr.street}
                            onChange={(e) => {
                              const next = [...editAddresses];
                              next[realIdx] = { ...addr, street: e.target.value };
                              setEditAddresses(next);
                            }}
                            placeholder="Street"
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-gray-900 text-sm"
                          />
                          <input
                            type="text"
                            value={addr.unit}
                            onChange={(e) => {
                              const next = [...editAddresses];
                              next[realIdx] = { ...addr, unit: e.target.value };
                              setEditAddresses(next);
                            }}
                            placeholder="Unit / Apt (optional)"
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-gray-900 text-sm"
                          />
                          <div className="grid grid-cols-3 gap-2">
                            <input
                              type="text"
                              value={addr.city}
                              onChange={(e) => {
                                const next = [...editAddresses];
                                next[realIdx] = { ...addr, city: e.target.value };
                                setEditAddresses(next);
                              }}
                              placeholder="City"
                              className="px-2 py-1.5 border border-gray-300 rounded text-gray-900 text-sm"
                            />
                            <input
                              type="text"
                              value={addr.state}
                              onChange={(e) => {
                                const next = [...editAddresses];
                                next[realIdx] = { ...addr, state: e.target.value };
                                setEditAddresses(next);
                              }}
                              placeholder="State"
                              className="px-2 py-1.5 border border-gray-300 rounded text-gray-900 text-sm"
                            />
                            <input
                              type="text"
                              value={addr.zipCode}
                              onChange={(e) => {
                                const next = [...editAddresses];
                                next[realIdx] = { ...addr, zipCode: e.target.value };
                                setEditAddresses(next);
                              }}
                              placeholder="ZIP"
                              className="px-2 py-1.5 border border-gray-300 rounded text-gray-900 text-sm"
                            />
                          </div>
                          <textarea
                            value={addr.deliveryNotes}
                            onChange={(e) => {
                              const next = [...editAddresses];
                              next[realIdx] = { ...addr, deliveryNotes: e.target.value };
                              setEditAddresses(next);
                            }}
                            rows={2}
                            placeholder="Delivery notes (optional)"
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-gray-900 text-sm"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <select
                              value={addr.driverId}
                              onChange={(e) => {
                                const next = [...editAddresses];
                                next[realIdx] = { ...addr, driverId: e.target.value };
                                setEditAddresses(next);
                              }}
                              className="px-2 py-1.5 border border-gray-300 rounded text-gray-900 text-sm"
                            >
                              <option value="">No driver</option>
                              {drivers.map((d) => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                              ))}
                            </select>
                            <input
                              type="number"
                              value={addr.stopNumber}
                              onChange={(e) => {
                                const next = [...editAddresses];
                                next[realIdx] = { ...addr, stopNumber: e.target.value };
                                setEditAddresses(next);
                              }}
                              placeholder="Stop #"
                              className="px-2 py-1.5 border border-gray-300 rounded text-gray-900 text-sm"
                            />
                          </div>
                        </div>
                      );
                    })}
                  <button
                    type="button"
                    onClick={() =>
                      setEditAddresses([
                        ...editAddresses,
                        { street: "", unit: "", city: "", state: "", zipCode: "", deliveryNotes: "", driverId: "", stopNumber: "" },
                      ])
                    }
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    + Add Address
                  </button>
                </div>
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

          {/* Right: Order History */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow rounded-lg p-4">
              <h2 className="font-semibold text-gray-900 mb-4">
                Order History
              </h2>

              {customer.orders.length === 0 ? (
                <p className="text-gray-500 text-sm">No orders yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Order #
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Type
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Total
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Payment
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {customer.orders.map((order) => (
                        <tr
                          key={order.id}
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() =>
                            router.push(`/admin/orders/${order.id}`)
                          }
                        >
                          <td className="px-4 py-3 text-sm font-mono text-blue-600">
                            {order.orderNumber}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {order.isPickup ? "Pickup" : "Delivery"}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            ${Number(order.totalAmount).toFixed(2)}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${
                                STATUS_COLORS[order.status] ||
                                "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {formatStatus(order.status)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${
                                PAYMENT_COLORS[order.paymentStatus] ||
                                "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {formatStatus(order.paymentStatus)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
