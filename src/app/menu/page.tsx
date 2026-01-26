"use client";

import { useEffect, useState } from "react";

type MenuItem = {
  id: string;
  name: string;
  description: string | null;
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
  menuItems: WeeklyMenuItem[];
};

const DAYS = [
  { num: 1, name: "Monday" },
  { num: 2, name: "Tuesday" },
  { num: 3, name: "Wednesday" },
  { num: 4, name: "Thursday" },
  { num: 5, name: "Friday" },
];

export default function MenuPage() {
  const [menu, setMenu] = useState<WeeklyMenu | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchMenu() {
      try {
        const res = await fetch("/api/menus/current");

        if (res.status === 404) {
          setError("No menu available for this week. Please check back later.");
          return;
        }

        if (!res.ok) {
          throw new Error("Failed to fetch menu");
        }

        const data = await res.json();
        setMenu(data);
      } catch (err) {
        setError(`Failed to load menu: ${err}`);
      } finally {
        setLoading(false);
      }
    }

    fetchMenu();
  }, []);

  function getEntreesForDay(dayOfWeek: number) {
    if (!menu) return [];
    return menu.menuItems.filter(
      (item) => item.dayOfWeek === dayOfWeek && item.menuItem.type === "ENTREE"
    );
  }

  function getSides() {
    if (!menu) return [];
    return menu.menuItems.filter((item) => item.dayOfWeek === 0);
  }

  function formatPrice(price: number): string {
    return `$${Number(price).toFixed(2)}`;
  }

  function formatWeekRange(dateString: string): string {
    const monday = new Date(dateString);
    const friday = new Date(monday);
    friday.setDate(friday.getDate() + 4);

    const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
    return `${monday.toLocaleDateString("en-US", options)} - ${friday.toLocaleDateString("en-US", options)}`;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading menu...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!menu) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            This Week&apos;s Menu
          </h1>
          <p className="text-lg text-gray-600">
            {formatWeekRange(menu.weekStartDate)}
          </p>
        </div>

        {/* Daily Entrees */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">
            Daily Entrees
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {DAYS.map((day) => (
              <div
                key={day.num}
                className="bg-white rounded-lg shadow p-4"
              >
                <h3 className="font-semibold text-gray-900 border-b pb-2 mb-3">
                  {day.name}
                </h3>
                <div className="space-y-3">
                  {getEntreesForDay(day.num).length === 0 ? (
                    <p className="text-sm text-gray-400">No entrees</p>
                  ) : (
                    getEntreesForDay(day.num).map((item) => (
                      <div key={item.id}>
                        <p className="font-medium text-gray-900">
                          {item.menuItem.name}
                        </p>
                        {item.menuItem.description && (
                          <p className="text-sm text-gray-500">
                            {item.menuItem.description}
                          </p>
                        )}
                        <p className="text-sm font-semibold text-green-600">
                          {formatPrice(item.menuItem.price)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sides */}
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">
            Sides (Available All Week)
          </h2>
          <div className="bg-white rounded-lg shadow p-6">
            {getSides().length === 0 ? (
              <p className="text-gray-400">No sides available</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {getSides().map((item) => (
                  <div
                    key={item.id}
                    className="bg-gray-50 rounded p-3"
                  >
                    <p className="font-medium text-gray-900">
                      {item.menuItem.name}
                    </p>
                    {item.menuItem.description && (
                      <p className="text-sm text-gray-500">
                        {item.menuItem.description}
                      </p>
                    )}
                    <p className="text-sm font-semibold text-green-600">
                      {formatPrice(item.menuItem.price)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}