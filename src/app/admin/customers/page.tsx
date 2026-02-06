"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatPhoneNumber } from "@/lib/formatPhone";

type Customer = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  isCreditAccount: boolean;
  createdAt: string;
  _count: { orders: number };
};

export default function AdminCustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [creditOnly, setCreditOnly] = useState(false);

  useEffect(() => {
    fetchCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creditOnly]);

  async function fetchCustomers() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (creditOnly) params.set("creditOnly", "true");

      const res = await fetch(`/api/admin/customers?${params}`);

      if (!res.ok) {
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        throw new Error("Failed to fetch");
      }

      const data = await res.json();
      setCustomers(data);
    } catch (err) {
      setError(`Failed to load customers: ${err}`);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    fetchCustomers();
  }

  if (loading && customers.length === 0) {
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
          <h1 className="text-3xl font-bold text-gray-900">Customers</h1>
          <Link
            href="/admin/orders"
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 uppercase font-semibold transition-colors"
          >
            Orders
          </Link>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white shadow rounded-lg p-4 mb-6 space-y-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-400"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-latin-red text-white rounded-full hover:bg-latin-orange uppercase font-semibold transition-colors"
            >
              SEARCH
            </button>
          </form>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={creditOnly}
              onChange={(e) => setCreditOnly(e.target.checked)}
              className="rounded border-gray-300"
            />
            Credit accounts only
          </label>
        </div>

        {/* Table */}
        <div className="bg-white shadow rounded-lg overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Orders
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Credit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Joined
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    No customers found.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/admin/customers/${c.id}`)}
                  >
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {c.firstName} {c.lastName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {c.email || "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {c.phone ? formatPhoneNumber(c.phone) : "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {c._count.orders}
                    </td>
                    <td className="px-6 py-4">
                      {c.isCreditAccount && (
                        <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                          Credit
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(c.createdAt).toLocaleDateString()}
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
