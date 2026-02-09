"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatShortDate, formatDateET } from "@/lib/timezone";

type WeeklyMenu = {
  id: string;
  weekStartDate: string;
  isPublished: boolean;
};

type PrepItem = {
  menuItemId: string;
  name: string;
  type: string;
  isDessert: boolean;
  completaQty: number;
  extraQty: number;
  totalQty: number;
};

type PrepSheet = {
  weekStartDate: string;
  dayOfWeek: number;
  dayName: string;
  totalOrders: number;
  totalCompletas: number;
  items: PrepItem[];
};

const DAYS = [
  { num: 1, name: "Mon" },
  { num: 2, name: "Tue" },
  { num: 3, name: "Wed" },
  { num: 4, name: "Thu" },
  { num: 5, name: "Fri" },
];

export default function PrepSheetsPage() {
  const router = useRouter();
  const [menus, setMenus] = useState<WeeklyMenu[]>([]);
  const [selectedMenuId, setSelectedMenuId] = useState("");
  const [selectedDay, setSelectedDay] = useState(1);
  const [prepSheet, setPrepSheet] = useState<PrepSheet | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState("");

  // Fetch available weekly menus
  useEffect(() => {
    async function fetchMenus() {
      try {
        const res = await fetch("/api/admin/weekly-menus");
        if (!res.ok) {
          if (res.status === 401) {
            router.push("/login");
            return;
          }
          throw new Error("Failed to fetch menus");
        }
        const data = await res.json();
        setMenus(data);
        if (data.length > 0) {
          setSelectedMenuId(data[0].id);
        }
      } catch (err) {
        setError(`Failed to load menus: ${err}`);
      } finally {
        setLoading(false);
      }
    }
    fetchMenus();
  }, [router]);

  // Fetch prep sheet when selection changes
  useEffect(() => {
    if (!selectedMenuId) return;

    async function fetchPrepSheet() {
      setFetching(true);
      setError("");
      try {
        const res = await fetch(
          `/api/admin/prep-sheet?weeklyMenuId=${selectedMenuId}&dayOfWeek=${selectedDay}`
        );
        if (!res.ok) throw new Error("Failed to fetch prep sheet");
        const data = await res.json();
        setPrepSheet(data);
      } catch (err) {
        setError(`Failed to load prep sheet: ${err}`);
        setPrepSheet(null);
      } finally {
        setFetching(false);
      }
    }
    fetchPrepSheet();
  }, [selectedMenuId, selectedDay]);

  function formatWeekRange(dateString: string): string {
    const monday = new Date(dateString);
    const friday = new Date(monday);
    friday.setDate(friday.getDate() + 4);
    const year = formatDateET(monday, { year: "numeric" });
    return `${formatShortDate(monday)} – ${formatShortDate(friday)}, ${year}`;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  const entrees = prepSheet?.items.filter((i) => i.type === "ENTREE") || [];
  const sides = prepSheet?.items.filter((i) => i.type === "SIDE") || [];
  const totalExtraEntrees = entrees.reduce((sum, i) => sum + i.extraQty, 0);
  const totalExtraSides = sides.reduce((sum, i) => sum + i.extraQty, 0);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Controls - hidden when printing */}
        <div className="print:hidden">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Prep Sheets</h1>
            <Link
              href="/admin/orders"
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 uppercase font-semibold transition-colors"
            >
              ORDERS
            </Link>
          </div>

          {error && (
            <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
              {error}
            </div>
          )}

          {menus.length === 0 ? (
            <p className="text-gray-500">No weekly menus available.</p>
          ) : (
            <div className="bg-white shadow rounded-lg p-4 mb-6 space-y-4">
              {/* Week selector */}
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Week
                </label>
                <select
                  value={selectedMenuId}
                  onChange={(e) => setSelectedMenuId(e.target.value)}
                  className="w-full sm:w-80 px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                >
                  {menus.map((menu) => (
                    <option key={menu.id} value={menu.id}>
                      {formatWeekRange(menu.weekStartDate)}
                      {menu.isPublished ? "" : " (Draft)"}
                    </option>
                  ))}
                </select>
              </div>

              {/* Day selector */}
              <div className="flex gap-1">
                {DAYS.map((day) => (
                  <button
                    key={day.num}
                    onClick={() => setSelectedDay(day.num)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      selectedDay === day.num
                        ? "bg-latin-red text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {day.name}
                  </button>
                ))}
              </div>

              {/* Print button */}
              <button
                onClick={() => window.print()}
                disabled={!prepSheet || prepSheet.items.length === 0}
                className="px-4 py-2 bg-latin-red text-white rounded-full hover:bg-latin-orange uppercase font-semibold transition-colors disabled:opacity-50 text-sm"
              >
                PRINT PREP SHEET
              </button>
            </div>
          )}
        </div>

        {/* Prep Sheet Content - visible in print */}
        {fetching ? (
          <div className="text-center py-8 text-gray-500 print:hidden">
            Loading...
          </div>
        ) : prepSheet ? (
          <div>
            {/* Print header - only visible when printing */}
            <div className="hidden print:block mb-6">
              <h1 className="text-2xl font-bold">
                Prep Sheet – {prepSheet.dayName}
              </h1>
              <p className="text-gray-600">
                Week of{" "}
                {formatWeekRange(prepSheet.weekStartDate)}
              </p>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="bg-white shadow rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">
                  {prepSheet.totalOrders}
                </p>
                <p className="text-sm text-gray-500">Orders</p>
              </div>
              <div className="bg-white shadow rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">
                  {prepSheet.totalCompletas}
                </p>
                <p className="text-sm text-gray-500">Completas</p>
              </div>
              <div className="bg-white shadow rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {totalExtraEntrees}
                </p>
                <p className="text-sm text-gray-500">Extra Entrees</p>
              </div>
              <div className="bg-white shadow rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-orange-600">
                  {totalExtraSides}
                </p>
                <p className="text-sm text-gray-500">Extra Sides</p>
              </div>
            </div>

            {prepSheet.items.length === 0 ? (
              <div className="bg-white shadow rounded-lg p-8 text-center text-gray-500">
                No orders for this day yet.
              </div>
            ) : (
              <div className="space-y-6">
                {/* Entrees */}
                {entrees.length > 0 && (
                  <div className="bg-white shadow rounded-lg overflow-hidden">
                    <div className="bg-green-50 px-6 py-3 border-b">
                      <h2 className="font-semibold text-green-800">Entrees</h2>
                    </div>
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Item
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            Completa
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            Extra
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase font-bold">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {entrees.map((item) => (
                          <tr key={item.menuItemId}>
                            <td className="px-6 py-3 text-sm text-gray-900">
                              {item.name}
                            </td>
                            <td className="px-6 py-3 text-sm text-gray-600 text-right">
                              {item.completaQty}
                            </td>
                            <td className="px-6 py-3 text-sm text-gray-600 text-right">
                              {item.extraQty}
                            </td>
                            <td className="px-6 py-3 text-sm font-bold text-gray-900 text-right">
                              {item.totalQty}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Sides */}
                {sides.length > 0 && (
                  <div className="bg-white shadow rounded-lg overflow-hidden">
                    <div className="bg-orange-50 px-6 py-3 border-b">
                      <h2 className="font-semibold text-orange-800">Sides</h2>
                    </div>
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Item
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            Completa
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            Extra
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase font-bold">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {sides.map((item) => (
                          <tr key={item.menuItemId}>
                            <td className="px-6 py-3 text-sm text-gray-900">
                              {item.name}
                              {item.isDessert && (
                                <span className="ml-1 text-xs text-purple-600">
                                  (dessert)
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-3 text-sm text-gray-600 text-right">
                              {item.completaQty}
                            </td>
                            <td className="px-6 py-3 text-sm text-gray-600 text-right">
                              {item.extraQty}
                            </td>
                            <td className="px-6 py-3 text-sm font-bold text-gray-900 text-right">
                              {item.totalQty}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
