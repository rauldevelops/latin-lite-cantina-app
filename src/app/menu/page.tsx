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
  const [menus, setMenus] = useState<WeeklyMenu[]>([]);
  const [selectedMenuIndex, setSelectedMenuIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchMenus() {
      try {
        const res = await fetch("/api/menus/upcoming");

        if (res.status === 404) {
          setError("No menus available. Please check back later.");
          return;
        }

        if (!res.ok) {
          throw new Error("Failed to fetch menus");
        }

        const data = await res.json();
        setMenus(data);

        // Auto-select first available week (skip current week if fully disabled)
        const now = new Date();
        const currentDay = now.getDay();
        // If Wednesday (3) or later, and first menu is current week, select next
        if (currentDay >= 3 && data.length > 1) {
          const firstMenuMonday = new Date(data[0].weekStartDate);
          const currentMonday = getCurrentMonday();
          if (firstMenuMonday.getTime() === currentMonday.getTime()) {
            setSelectedMenuIndex(1);
          }
        }
      } catch (err) {
        setError(`Failed to load menus: ${err}`);
      } finally {
        setLoading(false);
      }
    }

    fetchMenus();
  }, []);

  function getCurrentMonday(): Date {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  }

  function isCurrentWeek(menuDate: string): boolean {
    const menuMonday = new Date(menuDate);
    menuMonday.setHours(0, 0, 0, 0);
    const currentMonday = getCurrentMonday();
    return menuMonday.getTime() === currentMonday.getTime();
  }

  function isDayDisabled(dayOfWeek: number, menuDate: string): boolean {
    // Sides (dayOfWeek 0) follow the same rules as the week
    if (!isCurrentWeek(menuDate)) {
      return false; // Future weeks are never disabled
    }

    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.

    // Wednesday (3) or later: entire current week is disabled
    if (currentDay >= 3) {
      return true;
    }

    // Monday (1) or Tuesday (2): disable days up to and including today
    // currentDay 1 (Monday) -> disable day 1
    // currentDay 2 (Tuesday) -> disable days 1 and 2
    if (currentDay >= 1 && currentDay <= 2) {
      return dayOfWeek <= currentDay;
    }

    // Sunday (0) or Saturday (6): no days disabled for current week
    // (though in practice, weekend viewers can still order for Mon-Fri)
    return false;
  }

  function isEntireWeekDisabled(menuDate: string): boolean {
    if (!isCurrentWeek(menuDate)) {
      return false;
    }
    const now = new Date();
    return now.getDay() >= 3; // Wednesday or later
  }

  function getEntreesForDay(dayOfWeek: number) {
    const menu = menus[selectedMenuIndex];
    if (!menu) return [];
    return menu.menuItems.filter(
      (item) => item.dayOfWeek === dayOfWeek && item.menuItem.type === "ENTREE"
    );
  }

  function getSides() {
    const menu = menus[selectedMenuIndex];
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

  function getWeekLabel(dateString: string): string {
    const menuMonday = new Date(dateString);
    const currentMonday = getCurrentMonday();
    
    if (menuMonday.getTime() === currentMonday.getTime()) {
      return "This Week";
    }
    
    const nextMonday = new Date(currentMonday);
    nextMonday.setDate(nextMonday.getDate() + 7);
    if (menuMonday.getTime() === nextMonday.getTime()) {
      return "Next Week";
    }

    return formatWeekRange(dateString);
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

  if (menus.length === 0) {
    return null;
  }

  const selectedMenu = menus[selectedMenuIndex];
  const weekDisabled = isEntireWeekDisabled(selectedMenu.weekStartDate);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Weekly Menu
          </h1>
        </div>

        {/* Week Selector Tabs */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
            {menus.map((menu, index) => {
              const disabled = isEntireWeekDisabled(menu.weekStartDate);
              return (
                <button
                  key={menu.id}
                  onClick={() => setSelectedMenuIndex(index)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    selectedMenuIndex === index
                      ? "bg-green-600 text-white"
                      : disabled
                      ? "text-gray-400 cursor-not-allowed"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {getWeekLabel(menu.weekStartDate)}
                  {disabled && " (Closed)"}
                </button>
              );
            })}
          </div>
        </div>

        {/* Week Date Range */}
        <p className="text-center text-lg text-gray-600 mb-8">
          {formatWeekRange(selectedMenu.weekStartDate)}
        </p>

        {/* Deadline Notice */}
        {isCurrentWeek(selectedMenu.weekStartDate) && !weekDisabled && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8 text-center">
            <p className="text-yellow-800">
              <strong>Order deadline:</strong> Tuesday end of day for this week&apos;s meals
            </p>
          </div>
        )}

        {weekDisabled && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8 text-center">
            <p className="text-red-800">
              Ordering for this week is now closed. Please select a future week.
            </p>
          </div>
        )}

        {/* Daily Entrees */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">
            Daily Entrees
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {DAYS.map((day) => {
              const dayDisabled = isDayDisabled(day.num, selectedMenu.weekStartDate);
              return (
                <div
                  key={day.num}
                  className={`rounded-lg shadow p-4 ${
                    dayDisabled ? "bg-gray-100 opacity-60" : "bg-white"
                  }`}
                >
                  <h3 className={`font-semibold border-b pb-2 mb-3 ${
                    dayDisabled ? "text-gray-400" : "text-gray-900"
                  }`}>
                    {day.name}
                    {dayDisabled && (
                      <span className="ml-2 text-xs font-normal text-red-500">
                        (Closed)
                      </span>
                    )}
                  </h3>
                  <div className="space-y-3">
                    {getEntreesForDay(day.num).length === 0 ? (
                      <p className="text-sm text-gray-400">No entrees</p>
                    ) : (
                      getEntreesForDay(day.num).map((item) => (
                        <div key={item.id}>
                          <p className={`font-medium ${
                            dayDisabled ? "text-gray-400" : "text-gray-900"
                          }`}>
                            {item.menuItem.name}
                          </p>
                          {item.menuItem.description && (
                            <p className={`text-sm ${
                              dayDisabled ? "text-gray-400" : "text-gray-500"
                            }`}>
                              {item.menuItem.description}
                            </p>
                          )}
                          <p className={`text-sm font-semibold ${
                            dayDisabled ? "text-gray-400" : "text-green-600"
                          }`}>
                            {formatPrice(item.menuItem.price)}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sides */}
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">
            Sides (Available All Week)
          </h2>
          <div className={`rounded-lg shadow p-6 ${
            weekDisabled ? "bg-gray-100 opacity-60" : "bg-white"
          }`}>
            {getSides().length === 0 ? (
              <p className="text-gray-400">No sides available</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {getSides().map((item) => (
                  <div
                    key={item.id}
                    className={`rounded p-3 ${
                      weekDisabled ? "bg-gray-200" : "bg-gray-50"
                    }`}
                  >
                    <p className={`font-medium ${
                      weekDisabled ? "text-gray-400" : "text-gray-900"
                    }`}>
                      {item.menuItem.name}
                    </p>
                    {item.menuItem.description && (
                      <p className={`text-sm ${
                        weekDisabled ? "text-gray-400" : "text-gray-500"
                      }`}>
                        {item.menuItem.description}
                      </p>
                    )}
                    <p className={`text-sm font-semibold ${
                      weekDisabled ? "text-gray-400" : "text-green-600"
                    }`}>
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