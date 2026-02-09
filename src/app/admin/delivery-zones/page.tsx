"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type DeliveryZone = {
  id: string;
  zipCode: string;
  city: string | null;
  isActive: boolean;
  createdAt: string;
};

export default function DeliveryZonesPage() {
  const router = useRouter();
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // New zone form state
  const [newZone, setNewZone] = useState({
    zipCode: "",
    city: "",
  });

  useEffect(() => {
    fetchZones();
  }, []);

  async function fetchZones() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/delivery-zones");

      if (!res.ok) {
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        throw new Error("Failed to fetch delivery zones");
      }

      const data = await res.json();
      setZones(data);
    } catch (err) {
      setError(`Failed to load delivery zones: ${err}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddZone(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/admin/delivery-zones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newZone),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add delivery zone");
      }

      const created = await res.json();
      setZones((prev) => [...prev, created]);
      setNewZone({ zipCode: "", city: "" });
      setShowForm(false);
    } catch (err) {
      setError(`${err}`);
    } finally {
      setSaving(false);
    }
  }

  async function toggleZoneStatus(zone: DeliveryZone) {
    try {
      const res = await fetch(`/api/admin/delivery-zones/${zone.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !zone.isActive }),
      });

      if (!res.ok) {
        throw new Error("Failed to update zone");
      }

      const updated = await res.json();
      setZones((prev) => prev.map((z) => (z.id === zone.id ? updated : z)));
    } catch (err) {
      setError(`Failed to update zone: ${err}`);
    }
  }

  async function deleteZone(zoneId: string) {
    if (!confirm("Are you sure you want to delete this delivery zone?")) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/delivery-zones/${zoneId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete zone");
      }

      setZones((prev) => prev.filter((z) => z.id !== zoneId));
    } catch (err) {
      setError(`Failed to delete zone: ${err}`);
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
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Delivery Zones</h1>
          <Link
            href="/admin/orders"
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 uppercase font-semibold transition-colors"
          >
            Back to Orders
          </Link>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
            {error}
          </div>
        )}

        {zones.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-yellow-800">
              No delivery zones configured. When no zones are set, all zip codes are allowed by default.
              Add zip codes below to restrict delivery to specific areas.
            </p>
          </div>
        )}

        {/* Add Zone Form */}
        {showForm ? (
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-xl text-gray-700 font-semibold mb-4">Add Delivery Zone</h2>
            <form onSubmit={handleAddZone} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Zip Code (5 digits) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newZone.zipCode}
                  onChange={(e) =>
                    setNewZone({ ...newZone, zipCode: e.target.value })
                  }
                  placeholder="33024"
                  maxLength={5}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City (optional)
                </label>
                <input
                  type="text"
                  value={newZone.city}
                  onChange={(e) =>
                    setNewZone({ ...newZone, city: e.target.value })
                  }
                  placeholder="Hollywood"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md text-gray-900"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-latin-red text-white rounded-full hover:bg-latin-orange uppercase font-semibold transition-colors disabled:bg-gray-400"
                >
                  {saving ? "Adding..." : "Add Zone"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setNewZone({ zipCode: "", city: "" });
                    setError("");
                  }}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 uppercase font-semibold transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="mb-6">
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-2 bg-latin-red text-white rounded-full hover:bg-latin-orange uppercase font-semibold transition-colors"
            >
              Add Zip Code
            </button>
          </div>
        )}

        {/* Zones Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Zip Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  City
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {zones.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                    No delivery zones configured
                  </td>
                </tr>
              ) : (
                zones.map((zone) => (
                  <tr key={zone.id}>
                    <td className="px-6 py-4 text-sm font-mono text-gray-900">
                      {zone.zipCode}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {zone.city || "-"}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          zone.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {zone.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => toggleZoneStatus(zone)}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          {zone.isActive ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          onClick={() => deleteZone(zone.id)}
                          className="text-red-600 hover:text-red-800 font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">How it works:</h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Add zip codes where you deliver</li>
            <li>When no zones are configured, all zip codes are accepted</li>
            <li>Once zones are added, only those zip codes will be allowed</li>
            <li>Inactive zones are kept in the system but not used for validation</li>
            <li>Customers entering invalid zip codes will see a helpful error message</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
