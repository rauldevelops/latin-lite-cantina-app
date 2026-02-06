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
  addressId: string | null;
  address: {
    street: string;
    unit: string | null;
    city: string;
    state: string;
    zipCode: string;
    deliveryNotes: string | null;
  } | null;
  driverId: string | null;
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
  const [savingStopNumber, setSavingStopNumber] = useState<string | null>(null);
  const [savingDriver, setSavingDriver] = useState<string | null>(null);

  async function updateDriver(addressId: string, driverId: string | null) {
    setSavingDriver(addressId);
    try {
      const response = await fetch(`/api/admin/addresses/${addressId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driverId }),
      });
      if (!response.ok) throw new Error("Failed to update");
      // Update local state
      const driver = drivers.find((d) => d.id === driverId);
      setLabels((prev) =>
        prev.map((l) =>
          l.addressId === addressId
            ? { ...l, driverId, driverName: driver?.name || null }
            : l
        )
      );
    } catch {
      setError("Failed to save driver");
    } finally {
      setSavingDriver(null);
    }
  }

  async function updateStopNumber(addressId: string, stopNumber: number | null) {
    setSavingStopNumber(addressId);
    try {
      const response = await fetch(`/api/admin/addresses/${addressId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stopNumber }),
      });
      if (!response.ok) throw new Error("Failed to update");
      // Update local state
      setLabels((prev) =>
        prev.map((l) =>
          l.addressId === addressId ? { ...l, stopNumber } : l
        )
      );
    } catch {
      setError("Failed to save stop number");
    } finally {
      setSavingStopNumber(null);
    }
  }

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
    <div className="min-h-screen bg-gray-50 p-8 print:min-h-0 print:bg-white print:p-0">
      <div className="max-w-6xl mx-auto print:max-w-none">
      <div className="print:hidden">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Delivery Manifest</h1>
          <div className="flex gap-3">
            <Link href="/admin/drivers" className="px-4 py-2 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 uppercase font-semibold transition-colors">
              MANAGE DRIVERS
            </Link>
            <Link
              href={`/admin/delivery-labels?weeklyMenuId=${selectedMenuId}&dayOfWeek=${selectedDay}${selectedDriverId ? `&driverId=${selectedDriverId}` : ""}`}
              className="px-4 py-2 bg-latin-red text-white rounded-full hover:bg-latin-orange uppercase font-semibold transition-colors"
            >
              PRINT LABELS
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
                    ? "bg-latin-red text-white"
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
            PRINT MANIFEST
          </button>
        </div>
      </div>

      {/* Print header */}
      <div className="hidden print:block mb-2">
        <h1 className="text-sm font-bold">
          Delivery Manifest — {DAYS.find((d) => d.num === selectedDay)?.name}{" "}
          {selectedMenu && `(Week of ${new Date(selectedMenu.weekStartDate).toLocaleDateString()})`}
        </h1>
        {selectedDriverId && (
          <p className="text-xs text-gray-600">
            Driver: {drivers.find((d) => d.id === selectedDriverId)?.name || ""}
          </p>
        )}
      </div>

      {loading ? (
        <p className="text-gray-500 print:hidden">Loading...</p>
      ) : orders.length === 0 ? (
        <p className="text-gray-500 print:hidden">No deliveries for this day.</p>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden overflow-x-auto print:shadow-none print:rounded-none print:overflow-visible">
          <table className="min-w-full divide-y divide-gray-200 text-sm print:text-[9px] print:w-full print:min-w-0 print:table-fixed">
            <thead className="bg-gray-50 print:bg-white">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase print:px-1 print:py-0.5 print:text-[8px] print:w-[10%]">Driver</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase print:px-1 print:py-0.5 print:text-[8px] print:w-[5%]">Stop</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase print:px-1 print:py-0.5 print:text-[8px] print:w-[14%]">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase print:px-1 print:py-0.5 print:text-[8px] print:w-[22%]">Address</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase print:px-1 print:py-0.5 print:text-[8px] print:w-[12%]">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase print:px-1 print:py-0.5 print:text-[8px] print:w-[15%]">Notes</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase print:px-1 print:py-0.5 print:text-[8px] print:w-[14%]">Items</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase print:px-1 print:py-0.5 print:text-[8px] print:w-[8%]">Balance</th>
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
                if (completaCount > 0) summary.push(`${completaCount}C`);
                if (extraEntreeCount > 0) summary.push(`${extraEntreeCount}XE`);
                if (extraSideCount > 0) summary.push(`${extraSideCount}XS`);

                return (
                  <tr key={i}>
                    <td className="px-6 py-4 text-gray-900 print:px-1 print:py-0.5">
                      <span className="print:hidden">
                        {o.addressId ? (
                          <select
                            value={o.driverId || ""}
                            onChange={(e) => {
                              const val = e.target.value || null;
                              if (o.addressId) {
                                updateDriver(o.addressId, val);
                              }
                            }}
                            disabled={savingDriver === o.addressId}
                            className="w-32 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                          >
                            <option value="">Unassigned</option>
                            {drivers.map((d) => (
                              <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                          </select>
                        ) : (
                          "—"
                        )}
                      </span>
                      <span className="hidden print:inline">{o.driverName || "—"}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-900 font-medium print:px-1 print:py-0.5 print:text-center">
                      <span className="print:hidden">
                        {o.addressId ? (
                          <input
                            type="number"
                            min="1"
                            value={o.stopNumber ?? ""}
                            onChange={(e) => {
                              const val = e.target.value ? parseInt(e.target.value, 10) : null;
                              // Optimistic update
                              setLabels((prev) =>
                                prev.map((l) =>
                                  l.addressId === o.addressId ? { ...l, stopNumber: val } : l
                                )
                              );
                            }}
                            onBlur={(e) => {
                              if (o.addressId) {
                                const val = e.target.value ? parseInt(e.target.value, 10) : null;
                                updateStopNumber(o.addressId, val);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && o.addressId) {
                                const val = (e.target as HTMLInputElement).value
                                  ? parseInt((e.target as HTMLInputElement).value, 10)
                                  : null;
                                updateStopNumber(o.addressId, val);
                                (e.target as HTMLInputElement).blur();
                              }
                            }}
                            disabled={savingStopNumber === o.addressId}
                            className="w-16 px-2 py-1 text-center border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                            placeholder="—"
                          />
                        ) : (
                          "—"
                        )}
                      </span>
                      <span className="hidden print:inline">{o.stopNumber ?? "—"}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-900 print:px-1 print:py-0.5">{o.customerLastName}, {o.customerFirstName}</td>
                    <td className="px-6 py-4 text-gray-700 text-xs print:px-1 print:py-0.5 print:break-words">
                      {o.address ? (
                        <>
                          {o.address.street}{o.address.unit ? ` ${o.address.unit}` : ""}, {o.address.city} {o.address.zipCode}
                        </>
                      ) : "—"}
                    </td>
                    <td className="px-6 py-4 text-gray-700 print:px-1 print:py-0.5">{o.phone ? formatPhoneNumber(o.phone) : "—"}</td>
                    <td className="px-6 py-4 text-gray-700 text-xs print:px-1 print:py-0.5 print:break-words">{o.address?.deliveryNotes || "—"}</td>
                    <td className="px-6 py-4 text-gray-700 text-xs print:px-1 print:py-0.5">
                      {summary.join(", ") || "—"}
                    </td>
                    <td className="px-6 py-4 text-right text-gray-900 print:px-1 print:py-0.5">${o.balanceDue.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-50 print:bg-white">
              <tr>
                <td colSpan={7} className="px-6 py-3 text-right text-sm font-semibold text-gray-900 print:px-1 print:py-0.5 print:text-[9px]">Total ({orders.length} deliveries)</td>
                <td className="px-6 py-3 text-right text-sm font-semibold text-gray-900 print:px-1 print:py-0.5 print:text-[9px]">
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
