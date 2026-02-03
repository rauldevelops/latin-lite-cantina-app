"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatPhoneNumber } from "@/lib/formatPhone";

type WeeklyMenu = {
  id: string;
  weekStartDate: string;
  isPublished: boolean;
};

type Driver = { id: string; name: string };

type Label = {
  orderNumber: string;
  customerFirstName: string;
  customerLastName: string;
  phone: string | null;
  address: {
    street: string;
    unit: string | null;
    city: string;
    state: string;
    zipCode: string;
    deliveryNotes: string | null;
  } | null;
  driverName: string | null;
  stopNumber: number | null;
  dayLabel: string;
  bagIndex: number;
  totalBags: number;
  entree: string | null;
  sides: string[];
  extraEntrees: string[];
  extraSides: string[];
  balanceDue: number;
};

const DAYS = [
  { num: 1, name: "Mon" },
  { num: 2, name: "Tue" },
  { num: 3, name: "Wed" },
  { num: 4, name: "Thu" },
  { num: 5, name: "Fri" },
];

export default function DeliveryManifestPage() {
  const router = useRouter();
  const [menus, setMenus] = useState<WeeklyMenu[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedMenuId, setSelectedMenuId] = useState("");
  const [selectedDay, setSelectedDay] = useState(1);
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [labels, setLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/weekly-menus").then((r) => { if (r.status === 401) { router.push("/login"); return []; } return r.json(); }),
      fetch("/api/admin/drivers?activeOnly=true").then((r) => r.json()),
    ]).then(([menuData, driverData]) => {
      const published = (menuData || []).filter((m: WeeklyMenu) => m.isPublished);
      setMenus(published);
      if (published.length > 0) setSelectedMenuId(published[0].id);
      setDrivers(driverData || []);
    }).catch(() => setError("Failed to load data"));
  }, []);

  useEffect(() => {
    if (!selectedMenuId) return;
    setLoading(true);
    setError("");
    const params = new URLSearchParams({
      weeklyMenuId: selectedMenuId,
      dayOfWeek: String(selectedDay),
    });
    if (selectedDriverId) params.set("driverId", selectedDriverId);

    fetch(`/api/admin/delivery-labels?${params}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setLabels)
      .catch(() => setError("Failed to load deliveries"))
      .finally(() => setLoading(false));
  }, [selectedMenuId, selectedDay, selectedDriverId]);

  // Deduplicate by orderNumber for manifest view (one row per order, not per bag)
  const orderMap = new Map<string, Label>();
  for (const l of labels) {
    if (!orderMap.has(l.orderNumber)) {
      orderMap.set(l.orderNumber, l);
    }
  }
  const orders = Array.from(orderMap.values());

  const selectedMenu = menus.find((m) => m.id === selectedMenuId);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
      <div className="print:hidden">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Delivery Manifest</h1>
          <div className="flex gap-3">
            <Link href="/admin/drivers" className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">
              Manage Drivers
            </Link>
            <Link
              href={`/admin/delivery-labels?weeklyMenuId=${selectedMenuId}&dayOfWeek=${selectedDay}${selectedDriverId ? `&driverId=${selectedDriverId}` : ""}`}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Print Labels
            </Link>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="flex flex-wrap gap-3 mb-6">
          <select
            value={selectedMenuId}
            onChange={(e) => setSelectedMenuId(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-gray-900 text-sm"
          >
            {menus.map((m) => (
              <option key={m.id} value={m.id}>
                Week of {new Date(m.weekStartDate).toLocaleDateString()}
              </option>
            ))}
          </select>

          <div className="flex gap-1">
            {DAYS.map((d) => (
              <button
                key={d.num}
                onClick={() => setSelectedDay(d.num)}
                className={`px-3 py-2 rounded-md text-sm ${
                  selectedDay === d.num
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {d.name}
              </button>
            ))}
          </div>

          <select
            value={selectedDriverId}
            onChange={(e) => setSelectedDriverId(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-gray-900 text-sm"
          >
            <option value="">All Drivers</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>

          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900 text-sm"
          >
            Print Manifest
          </button>
        </div>
      </div>

      {/* Print header */}
      <div className="hidden print:block mb-4">
        <h1 className="text-xl font-bold">
          Delivery Manifest — {DAYS.find((d) => d.num === selectedDay)?.name}{" "}
          {selectedMenu && `(Week of ${new Date(selectedMenu.weekStartDate).toLocaleDateString()})`}
        </h1>
        {selectedDriverId && (
          <p className="text-sm text-gray-600">
            Driver: {drivers.find((d) => d.id === selectedDriverId)?.name || ""}
          </p>
        )}
      </div>

      {loading ? (
        <p className="text-gray-500 print:hidden">Loading...</p>
      ) : orders.length === 0 ? (
        <p className="text-gray-500 print:hidden">No deliveries for this day.</p>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stop #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Driver Notes</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Driver</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders.map((o, i) => {
                // Count completas and extras for this order
                const orderLabels = labels.filter((l) => l.orderNumber === o.orderNumber);
                let completaCount = 0;
                let extraEntreeCount = 0;
                let extraSideCount = 0;
                for (const l of orderLabels) {
                  if (l.entree) completaCount++;
                  extraEntreeCount += l.extraEntrees.length;
                  extraSideCount += l.extraSides.length;
                }
                const summary: string[] = [];
                if (completaCount > 0) summary.push(`${completaCount} Completa${completaCount > 1 ? "s" : ""}`);
                if (extraEntreeCount > 0) summary.push(`${extraEntreeCount} Extra Entree${extraEntreeCount > 1 ? "s" : ""}`);
                if (extraSideCount > 0) summary.push(`${extraSideCount} Extra Side${extraSideCount > 1 ? "s" : ""}`);

                return (
                  <tr key={i}>
                    <td className="px-6 py-4 text-gray-900 font-medium">{o.stopNumber ?? "—"}</td>
                    <td className="px-6 py-4 text-gray-900">{o.customerLastName}, {o.customerFirstName}</td>
                    <td className="px-6 py-4 text-gray-700 text-xs">
                      {o.address ? (
                        <>
                          {o.address.street}{o.address.unit ? ` ${o.address.unit}` : ""}<br />
                          {o.address.city}, {o.address.state} {o.address.zipCode}
                        </>
                      ) : "—"}
                    </td>
                    <td className="px-6 py-4 text-gray-700">{o.phone ? formatPhoneNumber(o.phone) : "—"}</td>
                    <td className="px-6 py-4 text-gray-700 text-xs">{o.address?.deliveryNotes || "—"}</td>
                    <td className="px-6 py-4 text-gray-700">{o.driverName || "—"}</td>
                    <td className="px-6 py-4 text-gray-700 text-xs">
                      {summary.join(", ") || "—"}
                    </td>
                    <td className="px-6 py-4 text-right text-gray-900">${o.balanceDue.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td colSpan={7} className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Total ({orders.length} deliveries)</td>
                <td className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                  ${orders.reduce((sum, o) => sum + o.balanceDue, 0).toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      </div>
    </div>
  );
}
