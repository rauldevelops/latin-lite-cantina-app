"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  type: "ENTREE" | "SIDE";
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
  const [stapleItems, setStapleItems] = useState<MenuItem[]>([]);
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
        const weeklyMenus = data.weeklyMenus || data;
        setMenus(weeklyMenus);
        setStapleItems(data.stapleItems || []);

        // Auto-select first available week (skip current week if fully disabled)
        const now = new Date();
        const currentDay = now.getDay();
        // If Wednesday (3) or later, and first menu is current week, select next
        if (currentDay >= 3 && weeklyMenus.length > 1) {
          const firstMenuMonday = new Date(weeklyMenus[0].weekStartDate);
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
    if (!isCurrentWeek(menuDate)) {
      return false;
    }

    const now = new Date();
    const currentDay = now.getDay();

    if (currentDay >= 3) {
      return true;
    }

    if (currentDay >= 1 && currentDay <= 2) {
      return dayOfWeek <= currentDay;
    }

    return false;
  }

  function isEntireWeekDisabled(menuDate: string): boolean {
    if (!isCurrentWeek(menuDate)) {
      return false;
    }
    const now = new Date();
    return now.getDay() >= 3;
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
                      ? "bg-latin-red text-white"
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
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Staples Card */}
            {stapleItems.filter(item => item.type === "ENTREE").length > 0 && (
              <div
                className={`rounded-lg shadow ${
                  weekDisabled ? "bg-gray-100 opacity-60" : "bg-orange-50 border-2 border-orange-200"
                }`}
              >
                <h3 className={`font-semibold border-b p-4 ${
                  weekDisabled ? "text-gray-400 border-gray-200" : "text-latin-red border-orange-200"
                }`}>
                  Staples
                  <span className={`block text-xs font-normal ${
                    weekDisabled ? "text-gray-400" : "text-latin-red"
                  }`}>
                    Available Daily
                  </span>
                </h3>
                <div className="p-4 space-y-4">
                  {stapleItems
                    .filter(item => item.type === "ENTREE")
                    .map((item) => (
                      <div key={item.id}>
                        {item.imageUrl && (
                          <div className="relative w-full h-32 mb-2 rounded-lg overflow-hidden">
                            <Image
                              src={item.imageUrl}
                              alt={item.name}
                              fill
                              className="object-cover"
                              sizes="(max-width: 768px) 100vw, 16vw"
                            />
                          </div>
                        )}
                        <p className={`font-medium ${
                          weekDisabled ? "text-gray-400" : "text-gray-900"
                        }`}>
                          {item.name}
                        </p>
                        {item.description && (
                          <p className={`text-sm ${
                            weekDisabled ? "text-gray-400" : "text-gray-500"
                          }`}>
                            {item.description}
                          </p>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}

            {DAYS.map((day) => {
              const dayDisabled = isDayDisabled(day.num, selectedMenu.weekStartDate);
              return (
                <div
                  key={day.num}
                  className={`rounded-lg shadow ${
                    dayDisabled ? "bg-gray-100 opacity-60" : "bg-white"
                  }`}
                >
                  <h3 className={`font-semibold border-b p-4 ${
                    dayDisabled ? "text-gray-400" : "text-gray-900"
                  }`}>
                    {day.name}
                    {dayDisabled && (
                      <span className="ml-2 text-xs font-normal text-red-500">
                        (Closed)
                      </span>
                    )}
                  </h3>
                  <div className="p-4 space-y-4">
                    {getEntreesForDay(day.num).length === 0 ? (
                      <p className="text-sm text-gray-400">No entrees</p>
                    ) : (
                      getEntreesForDay(day.num).map((item) => (
                        <div key={item.id}>
                          {item.menuItem.imageUrl && (
                            <div className="relative w-full h-32 mb-2 rounded-lg overflow-hidden">
                              <Image
                                src={item.menuItem.imageUrl}
                                alt={item.menuItem.name}
                                fill
                                className="object-cover"
                                sizes="(max-width: 768px) 100vw, 20vw"
                              />
                            </div>
                          )}
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
                    className={`rounded-lg overflow-hidden ${
                      weekDisabled ? "bg-gray-200" : "bg-gray-50"
                    }`}
                  >
                    {item.menuItem.imageUrl && (
                      <div className="relative w-full h-24">
                        <Image
                          src={item.menuItem.imageUrl}
                          alt={item.menuItem.name}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 50vw, 25vw"
                        />
                      </div>
                    )}
                    <div className="p-3">
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
                    </div>
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
