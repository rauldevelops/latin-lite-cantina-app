"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Driver = {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  _count: { addresses: number };
};

export default function DriversPage() {
  const router = useRouter();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  async function fetchDrivers() {
    try {
      const res = await fetch("/api/admin/drivers");
      if (res.status === 401) { router.push("/login"); return; }
      if (!res.ok) throw new Error();
      setDrivers(await res.json());
    } catch {
      setError("Failed to load drivers");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchDrivers(); }, []);

  async function createDriver(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/admin/drivers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setNewName("");
      fetchDrivers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create driver");
    } finally {
      setCreating(false);
    }
  }

  async function updateDriver(id: string, data: Record<string, unknown>) {
    setError("");
    try {
      const res = await fetch(`/api/admin/drivers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setEditingId(null);
      fetchDrivers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update driver");
    }
  }

  async function deleteDriver(id: string) {
    if (!confirm("Delete this driver?")) return;
    setError("");
    try {
      const res = await fetch(`/api/admin/drivers/${id}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      fetchDrivers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete driver");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Drivers</h1>
          <div className="flex gap-3">
            <Link href="/admin/drivers/pay-report" className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
              Pay Report
            </Link>
            <Link href="/admin/delivery-manifest" className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">
              Delivery Manifest
            </Link>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={createDriver} className="flex gap-2 mb-6">
          <input
            type="text"
            placeholder="New driver name..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full sm:w-80 px-4 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-400"
          />
          <button
            type="submit"
            disabled={creating || !newName.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {creating ? "..." : "Add Driver"}
          </button>
        </form>

        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Addresses</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {drivers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                    No drivers yet. Add your first one above!
                  </td>
                </tr>
              ) : (
                drivers.map((d) => (
                  <tr key={d.id}>
                    <td className="px-6 py-4 text-gray-900">
                      {editingId === d.id ? (
                        <form
                          onSubmit={(e) => { e.preventDefault(); updateDriver(d.id, { name: editName }); }}
                          className="flex gap-2 items-center"
                        >
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="px-2 py-1 border border-gray-300 rounded text-gray-900 text-sm"
                            autoFocus
                          />
                          <button type="submit" className="text-sm text-blue-600 hover:text-blue-800">Save</button>
                          <button type="button" onClick={() => setEditingId(null)} className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
                        </form>
                      ) : (
                        <span className={`font-medium ${d.isActive ? "" : "text-gray-400 line-through"}`}>
                          {d.name}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        d.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      }`}>
                        {d.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">{d._count.addresses}</td>
                    <td className="px-6 py-4 text-right space-x-2">
                      {editingId !== d.id && (
                        <>
                          <button
                            onClick={() => { setEditingId(d.id); setEditName(d.name); }}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            Rename
                          </button>
                          <button
                            onClick={() => updateDriver(d.id, { isActive: !d.isActive })}
                            className="text-yellow-600 hover:text-yellow-800"
                          >
                            {d.isActive ? "Deactivate" : "Activate"}
                          </button>
                          {d._count.addresses === 0 && (
                            <button
                              onClick={() => deleteDriver(d.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              Delete
                            </button>
                          )}
                        </>
                      )}
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
