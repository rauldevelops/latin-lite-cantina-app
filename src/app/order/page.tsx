"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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
  menuItem: MenuItem;
};

type WeeklyMenu = {
  id: string;
  weekStartDate: string;
  menuItems: WeeklyMenuItem[];
};

type DaySelection = {
  entree: WeeklyMenuItem | null;
  sides: WeeklyMenuItem[];
};

type OrderSelections = {
  [dayOfWeek: number]: DaySelection;
};

const DAYS = [
  { num: 1, name: "Monday" },
  { num: 2, name: "Tuesday" },
  { num: 3, name: "Wednesday" },
  { num: 4, name: "Thursday" },
  { num: 5, name: "Friday" },
];

const COMPLETA_PRICE = 12.0; // 1 entree + 2 sides bundled price

export default function OrderPage() {
  const router = useRouter();
  const [menus, setMenus] = useState<WeeklyMenu[]>([]);
  const [selectedMenuIndex, setSelectedMenuIndex] = useState(0);
  const [selections, setSelections] = useState<OrderSelections>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchMenus() {
      try {
        const res = await fetch("/api/menus/upcoming");

        if (res.status === 404) {
          setError("No menus available for ordering.");
          return;
        }

        if (!res.ok) throw new Error("Failed to fetch menus");

        const data = await res.json();
        setMenus(data);

        // Auto-select first orderable week
        const now = new Date();
        const currentDay = now.getDay();
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
    if (!isCurrentWeek(menuDate)) return false;

    const now = new Date();
    const currentDay = now.getDay();

    if (currentDay >= 3) return true;
    if (currentDay >= 1 && currentDay <= 2) {
      return dayOfWeek <= currentDay;
    }

    return false;
  }

  function isEntireWeekDisabled(menuDate: string): boolean {
    if (!isCurrentWeek(menuDate)) return false;
    const now = new Date();
    return now.getDay() >= 3;
  }

  function getEntreesForDay(dayOfWeek: number): WeeklyMenuItem[] {
    const menu = menus[selectedMenuIndex];
    if (!menu) return [];
    return menu.menuItems.filter(
      (item) => item.dayOfWeek === dayOfWeek && item.menuItem.type === "ENTREE"
    );
  }

  function getSides(): WeeklyMenuItem[] {
    const menu = menus[selectedMenuIndex];
    if (!menu) return [];
    return menu.menuItems.filter((item) => item.dayOfWeek === 0);
  }

  function selectEntree(dayOfWeek: number, item: WeeklyMenuItem | null) {
    setSelections((prev) => ({
      ...prev,
      [dayOfWeek]: {
        entree: item,
        sides: prev[dayOfWeek]?.sides || [],
      },
    }));
  }

  function toggleSide(dayOfWeek: number, item: WeeklyMenuItem) {
    setSelections((prev) => {
      const current = prev[dayOfWeek] || { entree: null, sides: [] };
      const isSelected = current.sides.some((s) => s.id === item.id);

      let newSides: WeeklyMenuItem[];
      if (isSelected) {
        newSides = current.sides.filter((s) => s.id !== item.id);
      } else {
        if (current.sides.length >= 2) {
          // Replace oldest side
          newSides = [current.sides[1], item];
        } else {
          newSides = [...current.sides, item];
        }
      }

      return {
        ...prev,
        [dayOfWeek]: {
          ...current,
          sides: newSides,
        },
      };
    });
  }

  function isDayComplete(dayOfWeek: number): boolean {
    const sel = selections[dayOfWeek];
    return sel?.entree !== null && sel?.sides?.length === 2;
  }

  function getCompleteDays(): number[] {
    return DAYS.filter((day) => {
      const menu = menus[selectedMenuIndex];
      if (!menu) return false;
      if (isDayDisabled(day.num, menu.weekStartDate)) return false;
      return isDayComplete(day.num);
    }).map((day) => day.num);
  }

  function calculateTotal(): number {
    const completeDays = getCompleteDays();
    return completeDays.length * COMPLETA_PRICE;
  }

  function formatPrice(price: number): string {
    return `$${price.toFixed(2)}`;
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

  async function handleSubmitOrder() {
    const completeDays = getCompleteDays();
    if (completeDays.length === 0) {
      alert("Please complete at least one day (1 entree + 2 sides)");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const menu = menus[selectedMenuIndex];
      const orderDays = completeDays.map((dayOfWeek) => {
        const sel = selections[dayOfWeek];
        return {
          dayOfWeek,
          entreeId: sel.entree!.menuItem.id,
          sideIds: sel.sides.map((s) => s.menuItem.id),
        };
      });

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weeklyMenuId: menu.id,
          orderDays,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit order");
      }

      const order = await res.json();
      router.push(`/order/confirmation?id=${order.id}`);
    } catch (err) {
      setError(`Failed to submit order: ${err}`);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading menu...</p>
      </div>
    );
  }

  if (error && menus.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">{error}</p>
      </div>
    );
  }

  if (menus.length === 0) return null;

  const selectedMenu = menus[selectedMenuIndex];
  const weekDisabled = isEntireWeekDisabled(selectedMenu.weekStartDate);
  const completeDays = getCompleteDays();
  const sides = getSides();

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 text-center mb-2">
          Build Your Order
        </h1>
        <p className="text-center text-gray-600 mb-6">
          Select 1 entree + 2 sides for each day ({formatPrice(COMPLETA_PRICE)}/day)
        </p>

        {/* Week Selector */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
            {menus.map((menu, index) => {
              const disabled = isEntireWeekDisabled(menu.weekStartDate);
              return (
                <button
                  key={menu.id}
                  onClick={() => {
                    setSelectedMenuIndex(index);
                    setSelections({});
                  }}
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

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-center">
            {error}
          </div>
        )}

        {weekDisabled ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
            <p className="text-red-800">
              Ordering for this week is closed. Please select a future week.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Day Selection */}
            <div className="lg:col-span-2 space-y-6">
              {DAYS.map((day) => {
                const dayDisabled = isDayDisabled(day.num, selectedMenu.weekStartDate);
                const entrees = getEntreesForDay(day.num);
                const sel = selections[day.num] || { entree: null, sides: [] };
                const complete = isDayComplete(day.num);

                return (
                  <div
                    key={day.num}
                    className={`bg-white rounded-lg shadow p-4 ${
                      dayDisabled ? "opacity-50" : ""
                    } ${complete ? "ring-2 ring-green-500" : ""}`}
                  >
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {day.name}
                        {dayDisabled && (
                          <span className="ml-2 text-sm text-red-500">(Closed)</span>
                        )}
                      </h3>
                      {complete && (
                        <span className="text-green-600 text-sm font-medium">
                          ✓ Complete
                        </span>
                      )}
                    </div>

                    {!dayDisabled && (
                      <>
                        {/* Entree Selection */}
                        <div className="mb-4">
                          <p className="text-sm font-medium text-gray-700 mb-2">
                            Select Entree (1):
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {entrees.map((item) => (
                              <button
                                key={item.id}
                                onClick={() =>
                                  selectEntree(
                                    day.num,
                                    sel.entree?.id === item.id ? null : item
                                  )
                                }
                                className={`px-3 py-2 rounded-md text-sm ${
                                  sel.entree?.id === item.id
                                    ? "bg-green-600 text-white"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                }`}
                              >
                                {item.menuItem.name}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Sides Selection */}
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">
                            Select Sides (2): {sel.sides.length}/2
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {sides.map((item) => {
                              const isSelected = sel.sides.some(
                                (s) => s.id === item.id
                              );
                              return (
                                <button
                                  key={item.id}
                                  onClick={() => toggleSide(day.num, item)}
                                  className={`px-3 py-2 rounded-md text-sm ${
                                    isSelected
                                      ? "bg-green-600 text-white"
                                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                  }`}
                                >
                                  {item.menuItem.name}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow p-4 sticky top-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Order Summary
                </h3>

                {completeDays.length === 0 ? (
                  <p className="text-gray-500 text-sm">
                    Select items to build your order
                  </p>
                ) : (
                  <div className="space-y-3">
                    {completeDays.map((dayNum) => {
                      const day = DAYS.find((d) => d.num === dayNum)!;
                      const sel = selections[dayNum];
                      return (
                        <div
                          key={dayNum}
                          className="border-b border-gray-100 pb-3"
                        >
                          <p className="font-medium text-gray-900">{day.name}</p>
                          <p className="text-sm text-gray-600">
                            {sel.entree?.menuItem.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            + {sel.sides.map((s) => s.menuItem.name).join(", ")}
                          </p>
                          <p className="text-sm text-green-600">
                            {formatPrice(COMPLETA_PRICE)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="border-t border-gray-200 mt-4 pt-4">
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total</span>
                    <span>{formatPrice(calculateTotal())}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {completeDays.length} day(s) selected
                  </p>
                </div>

                <button
                  onClick={handleSubmitOrder}
                  disabled={completeDays.length === 0 || submitting}
                  className="w-full mt-4 bg-green-600 text-white py-3 rounded-md font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "Submitting..." : "Place Order"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}