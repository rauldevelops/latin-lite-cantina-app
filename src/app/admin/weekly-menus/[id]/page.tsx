"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

type MenuItem = {
  id: string;
  name: string;
  type: "ENTREE" | "SIDE";
  price: number;
};

type WeeklyMenuItem = {
  id: string;
  dayOfWeek: number;
  isSpecial: boolean;
  menuItem: MenuItem;
};

type WeeklyMenu = {
  id: string;
  weekStartDate: string;
  isPublished: boolean;
  menuItems: WeeklyMenuItem[];
};

const DAYS = [
  { num: 1, name: "Monday" },
  { num: 2, name: "Tuesday" },
  { num: 3, name: "Wednesday" },
  { num: 4, name: "Thursday" },
  { num: 5, name: "Friday" },
];

export default function WeeklyMenuBuilderPage() {
  const router = useRouter();
  const params = useParams();
  const [weeklyMenu, setWeeklyMenu] = useState<WeeklyMenu | null>(null);
  const [allMenuItems, setAllMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDay, setSelectedDay] = useState<number>(1);

  useEffect(() => {
    async function fetchData() {
      try {
        const id = params.id;

        const [menuRes, itemsRes] = await Promise.all([
          fetch(`/api/admin/weekly-menus/${id}`),
          fetch("/api/admin/menu-items"),
        ]);

        if (!menuRes.ok || !itemsRes.ok) {
          if (menuRes.status === 401 || itemsRes.status === 401) {
            router.push("/login");
            return;
          }
          throw new Error("Failed to fetch");
        }

        const [menuData, itemsData] = await Promise.all([
          menuRes.json(),
          itemsRes.json(),
        ]);

        setWeeklyMenu(menuData);
        setAllMenuItems(itemsData);
      } catch (err) {
        setError("Failed to load data");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [params.id, router]);

  async function addItemToDay(menuItemId: string) {
    if (!weeklyMenu) return;

    try {
      const res = await fetch(`/api/admin/weekly-menus/${weeklyMenu.id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          menuItemId,
          dayOfWeek: selectedDay,
          isSpecial: false,
        }),
      });

      if (!res.ok) {
        const result = await res.json();
        alert(result.error || "Failed to add item");
        return;
      }

      const newItem = await res.json();
      setWeeklyMenu({
        ...weeklyMenu,
        menuItems: [...weeklyMenu.menuItems, newItem],
      });
    } catch (err) {
      alert("Something went wrong");
    }
  }

  async function removeItemFromDay(weeklyMenuItemId: string) {
    if (!weeklyMenu) return;

    try {
      const res = await fetch(`/api/admin/weekly-menus/${weeklyMenu.id}/items`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weeklyMenuItemId }),
      });

      if (!res.ok) throw new Error("Failed to remove");

      setWeeklyMenu({
        ...weeklyMenu,
        menuItems: weeklyMenu.menuItems.filter((item) => item.id !== weeklyMenuItemId),
      });
    } catch (err) {
      alert("Failed to remove item");
    }
  }

  function getItemsForDay(dayOfWeek: number) {
    if (!weeklyMenu) return [];
    return weeklyMenu.menuItems.filter((item) => item.dayOfWeek === dayOfWeek);
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!weeklyMenu) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Weekly menu not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <Link
            href="/admin/weekly-menus"
            className="text-blue-600 hover:text-blue-800"
          >
            ← Back to Weekly Menus
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-4">
            Week of {formatDate(weeklyMenu.weekStartDate)}
          </h1>
          <p className="text-gray-600 mt-1">
            Status:{" "}
            <span
              className={
                weeklyMenu.isPublished ? "text-green-600" : "text-yellow-600"
              }
            >
              {weeklyMenu.isPublished ? "Published" : "Draft"}
            </span>
          </p>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Days Grid */}
          <div className="lg:col-span-3">
            <div className="grid grid-cols-5 gap-4">
              {DAYS.map((day) => (
                <div
                  key={day.num}
                  className={`bg-white shadow rounded-lg p-4 cursor-pointer border-2 ${
                    selectedDay === day.num
                      ? "border-blue-500"
                      : "border-transparent"
                  }`}
                  onClick={() => setSelectedDay(day.num)}
                >
                  <h3 className="font-semibold text-gray-900 mb-3">{day.name}</h3>
                  <div className="space-y-2">
                    {getItemsForDay(day.num).length === 0 ? (
                      <p className="text-sm text-gray-400">No items</p>
                    ) : (
                      getItemsForDay(day.num).map((item) => (
                        <div
                          key={item.id}
                          className="flex justify-between items-start text-sm bg-gray-50 p-2 rounded"
                        >
                          <div>
                            <p className="font-medium text-gray-900">
                              {item.menuItem.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {item.menuItem.type}
                            </p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeItemFromDay(item.id);
                            }}
                            className="text-red-500 hover:text-red-700 text-xs"
                          >
                            ✕
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Available Items Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow rounded-lg p-4 sticky top-8">
              <h3 className="font-semibold text-gray-900 mb-4">
                Add to {DAYS.find((d) => d.num === selectedDay)?.name}
              </h3>

              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">
                    Entrees
                  </h4>
                  <div className="space-y-1">
                    {allMenuItems
                      .filter((item) => item.type === "ENTREE")
                      .map((item) => (
                        <button
                          key={item.id}
                          onClick={() => addItemToDay(item.id)}
                          className="w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-blue-50 rounded text-gray-900"
                        >
                          {item.name}
                        </button>
                      ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">
                    Sides
                  </h4>
                  <div className="space-y-1">
                    {allMenuItems
                      .filter((item) => item.type === "SIDE")
                      .map((item) => (
                        <button
                          key={item.id}
                          onClick={() => addItemToDay(item.id)}
                          className="w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-blue-50 rounded text-gray-900"
                        >
                          {item.name}
                        </button>
                      ))}
                  </div>
                </div>
              </div>

              {allMenuItems.length === 0 && (
                <p className="text-sm text-gray-500">
                  No menu items available.{" "}
                  <Link href="/admin/menu-items/new" className="text-blue-600">
                    Create some first
                  </Link>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}