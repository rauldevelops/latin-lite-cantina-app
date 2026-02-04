"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  type: "ENTREE" | "SIDE";
  price: number;
  isDessert: boolean;
  isSoup: boolean;
  isStaple: boolean;
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

// A single side selection with quantity
type SideSelection = {
  weeklyMenuItemId: string;
  menuItemId: string;
  name: string;
  isDessert: boolean;
  isSoup: boolean;
  quantity: number;
};

// A single completa: 1 entree + 3 side slots
type Completa = {
  entree: WeeklyMenuItem | null;
  sides: SideSelection[];
};

// Per-day selections
type DaySelection = {
  completas: Completa[];
  extraEntrees: { item: WeeklyMenuItem; quantity: number }[];
  extraSides: SideSelection[];
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

const SIDES_PER_COMPLETA = 3;
const MIN_DAYS_PER_ORDER = 3;

function emptyCompleta(): Completa {
  return { entree: null, sides: [] };
}

function emptyDaySelection(): DaySelection {
  return { completas: [], extraEntrees: [], extraSides: [] };
}

function getTotalSideSlots(sides: SideSelection[]): number {
  return sides.reduce((sum, s) => sum + s.quantity, 0);
}

function getDessertCount(sides: SideSelection[]): number {
  return sides.filter((s) => s.isDessert).reduce((sum, s) => sum + s.quantity, 0);
}

function getSoupCount(sides: SideSelection[]): number {
  return sides.filter((s) => s.isSoup).reduce((sum, s) => sum + s.quantity, 0);
}

export default function OrderPage() {
  const router = useRouter();
  const [menus, setMenus] = useState<WeeklyMenu[]>([]);
  const [stapleItems, setStapleItems] = useState<MenuItem[]>([]);
  const [selectedMenuIndex, setSelectedMenuIndex] = useState(0);
  const [selections, setSelections] = useState<OrderSelections>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedCompletas, setExpandedCompletas] = useState<Set<string>>(new Set());
  const [expandedExtras, setExpandedExtras] = useState<Record<number, { entrees: boolean; sides: boolean }>>({});

  function toggleExpandedExtras(dayOfWeek: number, type: "entrees" | "sides") {
    setExpandedExtras((prev) => ({
      ...prev,
      [dayOfWeek]: {
        entrees: prev[dayOfWeek]?.entrees || false,
        sides: prev[dayOfWeek]?.sides || false,
        [type]: !prev[dayOfWeek]?.[type],
      },
    }));
  }

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
        setMenus(data.weeklyMenus);
        setStapleItems(data.stapleItems || []);

        const now = new Date();
        const currentDay = now.getDay();
        if (currentDay >= 3 && data.weeklyMenus.length > 1) {
          const firstMenuMonday = new Date(data.weeklyMenus[0].weekStartDate);
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
    return menuMonday.getTime() === getCurrentMonday().getTime();
  }

  function isDayDisabled(dayOfWeek: number, menuDate: string): boolean {
    if (!isCurrentWeek(menuDate)) return false;
    const currentDay = new Date().getDay();
    if (currentDay >= 3) return true;
    if (currentDay >= 1 && currentDay <= 2) return dayOfWeek <= currentDay;
    return false;
  }

  function isEntireWeekDisabled(menuDate: string): boolean {
    if (!isCurrentWeek(menuDate)) return false;
    return new Date().getDay() >= 3;
  }

  function getEntreesForDay(dayOfWeek: number): WeeklyMenuItem[] {
    const menu = menus[selectedMenuIndex];
    if (!menu) return [];

    // Get day-specific entrees from the weekly menu
    const dayEntrees = menu.menuItems.filter(
      (item) => item.dayOfWeek === dayOfWeek && item.menuItem.type === "ENTREE"
    );

    // Create synthetic WeeklyMenuItem objects for staple entrees
    // Use a stable ID format: staple-{menuItemId}
    const stapleEntrees: WeeklyMenuItem[] = stapleItems
      .filter((item) => item.type === "ENTREE")
      .map((item) => ({
        id: `staple-${item.id}`,
        dayOfWeek: dayOfWeek,
        menuItem: item,
      }));

    // Combine: staples first (always available), then day-specific
    return [...stapleEntrees, ...dayEntrees];
  }

  function getSides(): WeeklyMenuItem[] {
    const menu = menus[selectedMenuIndex];
    if (!menu) return [];

    // Get sides from the weekly menu (dayOfWeek = 0 means available all week)
    const menuSides = menu.menuItems.filter((item) => item.dayOfWeek === 0);

    // Create synthetic WeeklyMenuItem objects for staple sides
    const stapleSides: WeeklyMenuItem[] = stapleItems
      .filter((item) => item.type === "SIDE")
      .map((item) => ({
        id: `staple-${item.id}`,
        dayOfWeek: 0,
        menuItem: item,
      }));

    // Combine: staples first, then weekly menu sides
    return [...stapleSides, ...menuSides];
  }

  function getDaySelection(dayOfWeek: number): DaySelection {
    return selections[dayOfWeek] || emptyDaySelection();
  }

  function getDaySelectionFromPrev(prev: OrderSelections, dayOfWeek: number): DaySelection {
    return prev[dayOfWeek] || emptyDaySelection();
  }

  // Completa management
  function addCompleta(dayOfWeek: number) {
    setSelections((prev) => {
      const day = getDaySelectionFromPrev(prev, dayOfWeek);
      return {
        ...prev,
        [dayOfWeek]: {
          ...day,
          completas: [...day.completas, emptyCompleta()],
        },
      };
    });
  }

  function removeCompleta(dayOfWeek: number, index: number) {
    setSelections((prev) => {
      const day = getDaySelectionFromPrev(prev, dayOfWeek);
      return {
        ...prev,
        [dayOfWeek]: {
          ...day,
          completas: day.completas.filter((_, i) => i !== index),
        },
      };
    });
  }

  function setCompletaEntree(dayOfWeek: number, completaIndex: number, item: WeeklyMenuItem | null) {
    setSelections((prev) => {
      const day = getDaySelectionFromPrev(prev, dayOfWeek);
      const completas = [...day.completas];
      completas[completaIndex] = { ...completas[completaIndex], entree: item };
      return { ...prev, [dayOfWeek]: { ...day, completas } };
    });
  }

  function updateCompletaSide(
    dayOfWeek: number,
    completaIndex: number,
    weeklyMenuItem: WeeklyMenuItem,
    delta: number
  ) {
    setSelections((prev) => {
      const day = getDaySelectionFromPrev(prev, dayOfWeek);
      const completas = [...day.completas];
      const completa = { ...completas[completaIndex] };
      const sides = [...completa.sides];

      const existingIndex = sides.findIndex(
        (s) => s.weeklyMenuItemId === weeklyMenuItem.id
      );

      if (existingIndex >= 0) {
        const newQty = sides[existingIndex].quantity + delta;
        if (newQty <= 0) {
          sides.splice(existingIndex, 1);
        } else {
          sides[existingIndex] = { ...sides[existingIndex], quantity: newQty };
        }
      } else if (delta > 0) {
        sides.push({
          weeklyMenuItemId: weeklyMenuItem.id,
          menuItemId: weeklyMenuItem.menuItem.id,
          name: weeklyMenuItem.menuItem.name,
          isDessert: weeklyMenuItem.menuItem.isDessert,
          isSoup: weeklyMenuItem.menuItem.isSoup,
          quantity: 1,
        });
      }

      // Enforce limits
      const totalSlots = getTotalSideSlots(sides);
      const dessertCount = getDessertCount(sides);
      const soupCount = getSoupCount(sides);

      if (totalSlots > SIDES_PER_COMPLETA) {
        return prev; // Don't allow exceeding 3 sides
      }
      if (dessertCount > 1) {
        return prev; // Don't allow more than 1 dessert
      }
      if (soupCount > 1) {
        return prev; // Don't allow more than 1 soup
      }

      completa.sides = sides;
      completas[completaIndex] = completa;
      return { ...prev, [dayOfWeek]: { ...day, completas } };
    });
  }

  // Remove an entire side selection from a completa
  function removeCompletaSide(
    dayOfWeek: number,
    completaIndex: number,
    weeklyMenuItemId: string
  ) {
    setSelections((prev) => {
      const day = getDaySelectionFromPrev(prev, dayOfWeek);
      const completas = [...day.completas];
      const completa = { ...completas[completaIndex] };
      completa.sides = completa.sides.filter(
        (s) => s.weeklyMenuItemId !== weeklyMenuItemId
      );
      completas[completaIndex] = completa;
      return { ...prev, [dayOfWeek]: { ...day, completas } };
    });
  }

  // Extra entrees
  function updateExtraEntree(dayOfWeek: number, item: WeeklyMenuItem, delta: number) {
    setSelections((prev) => {
      const day = getDaySelectionFromPrev(prev, dayOfWeek);
      const extras = [...day.extraEntrees];
      const existingIndex = extras.findIndex((e) => e.item.id === item.id);

      if (existingIndex >= 0) {
        const newQty = extras[existingIndex].quantity + delta;
        if (newQty <= 0) {
          extras.splice(existingIndex, 1);
        } else {
          extras[existingIndex] = { ...extras[existingIndex], quantity: newQty };
        }
      } else if (delta > 0) {
        extras.push({ item, quantity: 1 });
      }

      return { ...prev, [dayOfWeek]: { ...day, extraEntrees: extras } };
    });
  }

  // Extra sides
  function updateExtraSide(dayOfWeek: number, weeklyMenuItem: WeeklyMenuItem, delta: number) {
    setSelections((prev) => {
      const day = getDaySelectionFromPrev(prev, dayOfWeek);
      const extras = [...day.extraSides];
      const existingIndex = extras.findIndex(
        (s) => s.weeklyMenuItemId === weeklyMenuItem.id
      );

      if (existingIndex >= 0) {
        const newQty = extras[existingIndex].quantity + delta;
        if (newQty <= 0) {
          extras.splice(existingIndex, 1);
        } else {
          extras[existingIndex] = { ...extras[existingIndex], quantity: newQty };
        }
      } else if (delta > 0) {
        extras.push({
          weeklyMenuItemId: weeklyMenuItem.id,
          menuItemId: weeklyMenuItem.menuItem.id,
          name: weeklyMenuItem.menuItem.name,
          isDessert: weeklyMenuItem.menuItem.isDessert,
          isSoup: weeklyMenuItem.menuItem.isSoup,
          quantity: 1,
        });
      }

      return { ...prev, [dayOfWeek]: { ...day, extraSides: extras } };
    });
  }

  function toggleCompletaExpanded(dayOfWeek: number, completaIndex: number) {
    const key = `${dayOfWeek}-${completaIndex}`;
    setExpandedCompletas((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function isCompletaExpanded(dayOfWeek: number, completaIndex: number): boolean {
    return expandedCompletas.has(`${dayOfWeek}-${completaIndex}`);
  }

  function dayHasSelections(dayOfWeek: number): boolean {
    const day = getDaySelection(dayOfWeek);
    return (
      day.completas.length > 0 ||
      day.extraEntrees.length > 0 ||
      day.extraSides.length > 0
    );
  }

  function isCompletaComplete(completa: Completa): boolean {
    return completa.entree !== null && getTotalSideSlots(completa.sides) === SIDES_PER_COMPLETA;
  }

  function getOrderableDays(): number[] {
    const menu = menus[selectedMenuIndex];
    if (!menu) return [];
    return DAYS.filter((day) => {
      if (isDayDisabled(day.num, menu.weekStartDate)) return false;
      return dayHasSelections(day.num);
    }).map((day) => day.num);
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
    if (menuMonday.getTime() === currentMonday.getTime()) return "This Week";
    const nextMonday = new Date(currentMonday);
    nextMonday.setDate(nextMonday.getDate() + 7);
    if (menuMonday.getTime() === nextMonday.getTime()) return "Next Week";
    return formatWeekRange(dateString);
  }

  async function handleSubmitOrder() {
    const orderableDays = getOrderableDays();

    // Minimum days validation
    if (orderableDays.length < MIN_DAYS_PER_ORDER) {
      alert(
        `You must order for at least ${MIN_DAYS_PER_ORDER} days per week. You currently have ${orderableDays.length} day${orderableDays.length === 1 ? "" : "s"} selected.`
      );
      return;
    }

    // Each day must have at least 1 completa, and all completas must be complete
    for (const dayNum of orderableDays) {
      const dayName = DAYS.find((d) => d.num === dayNum)?.name;
      const day = getDaySelection(dayNum);

      if (day.completas.length === 0) {
        alert(`${dayName} needs at least 1 completa.`);
        return;
      }

      for (let i = 0; i < day.completas.length; i++) {
        if (!isCompletaComplete(day.completas[i])) {
          alert(
            `${dayName} Completa #${i + 1} is incomplete. Each completa needs 1 entree + ${SIDES_PER_COMPLETA} sides.`
          );
          return;
        }
      }
    }

    const menu = menus[selectedMenuIndex];
    const orderDays = orderableDays.map((dayOfWeek) => {
      const day = getDaySelection(dayOfWeek);
      return {
        dayOfWeek,
        completas: day.completas.map((c) => ({
          entreeId: c.entree!.menuItem.id,
          sides: c.sides.map((s) => ({
            menuItemId: s.menuItemId,
            quantity: s.quantity,
          })),
        })),
        extraEntrees: day.extraEntrees.map((e) => ({
          menuItemId: e.item.menuItem.id,
          quantity: e.quantity,
        })),
        extraSides: day.extraSides.map((s) => ({
          menuItemId: s.menuItemId,
          quantity: s.quantity,
        })),
      };
    });

    // Build human-readable summary for checkout page
    const summary = orderableDays.map((dayOfWeek) => {
      const dayName = DAYS.find((d) => d.num === dayOfWeek)!.name;
      const day = getDaySelection(dayOfWeek);
      return {
        dayOfWeek,
        dayName,
        completas: day.completas.map((c) => ({
          entreeName: c.entree!.menuItem.name,
          sideNames: c.sides.map((s) => `${s.quantity > 1 ? s.quantity + "x " : ""}${s.name}`),
        })),
        extraEntrees: day.extraEntrees.map((e) => ({
          name: e.item.menuItem.name,
          quantity: e.quantity,
        })),
        extraSides: day.extraSides.map((s) => ({
          name: s.name,
          quantity: s.quantity,
        })),
      };
    });

    sessionStorage.setItem(
      "checkoutOrderData",
      JSON.stringify({ weeklyMenuId: menu.id, orderDays, summary })
    );
    router.push("/order/checkout");
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
  const orderableDays = getOrderableDays();
  const sides = getSides();

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 text-center mb-2">
          Build Your Order
        </h1>
        <p className="text-center text-gray-600 mb-6">
          Each completa = 1 entree + {SIDES_PER_COMPLETA} sides (max 1 dessert)
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
                const daySel = getDaySelection(day.num);
                const hasItems = dayHasSelections(day.num);

                return (
                  <div
                    key={day.num}
                    className={`bg-white rounded-lg shadow p-4 ${
                      dayDisabled ? "opacity-50" : ""
                    }`}
                  >
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {day.name}
                        {dayDisabled && (
                          <span className="ml-2 text-sm text-red-500">(Closed)</span>
                        )}
                      </h3>
                      {!dayDisabled && (
                        <button
                          onClick={() => addCompleta(day.num)}
                          className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
                        >
                          + Add Completa
                        </button>
                      )}
                    </div>

                    {!dayDisabled && hasItems && (
                      <>
                        {/* Completas */}
                        {daySel.completas.map((completa, cIndex) => (
                          <div
                            key={cIndex}
                            className={`border rounded-lg p-3 mb-3 ${
                              isCompletaComplete(completa)
                                ? "border-green-300 bg-green-50"
                                : "border-gray-200"
                            }`}
                          >
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-medium text-gray-800">
                                Completa #{cIndex + 1}
                                {isCompletaComplete(completa) && (
                                  <span className="ml-2 text-green-600 text-sm">
                                    ✓
                                  </span>
                                )}
                              </span>
                              <div className="flex items-center gap-3">
                                {isCompletaComplete(completa) && (
                                  <button
                                    onClick={() => toggleCompletaExpanded(day.num, cIndex)}
                                    className="text-blue-600 text-sm hover:text-blue-800"
                                  >
                                    {isCompletaExpanded(day.num, cIndex) ? "Collapse" : "Edit"}
                                  </button>
                                )}
                                <button
                                  onClick={() => removeCompleta(day.num, cIndex)}
                                  className="text-red-500 text-sm hover:text-red-700"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>

                            {/* Selection Summary */}
                            {(completa.entree || completa.sides.length > 0) && (
                              <div className="flex flex-wrap gap-2 mb-3">
                                {completa.entree && (
                                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-sm bg-green-600 text-white">
                                    {completa.entree.menuItem.name}
                                  </span>
                                )}
                                {completa.sides.map((s) => (
                                  <span
                                    key={s.weeklyMenuItemId}
                                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-sm ${
                                      s.isDessert
                                        ? "bg-purple-100 text-purple-800"
                                        : s.isSoup
                                        ? "bg-amber-100 text-amber-800"
                                        : "bg-green-100 text-green-800"
                                    }`}
                                  >
                                    {s.quantity > 1 && `${s.quantity}x `}{s.name}
                                    <button
                                      onClick={() =>
                                        removeCompletaSide(day.num, cIndex, s.weeklyMenuItemId)
                                      }
                                      className="ml-0.5 hover:text-red-600 font-bold"
                                    >
                                      ×
                                    </button>
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Entree & Sides Pickers - collapsed when complete unless expanded */}
                            {(!isCompletaComplete(completa) || isCompletaExpanded(day.num, cIndex)) && (
                            <>
                            {/* Entree Selection */}
                            <div className="mb-3">
                              <p className="text-sm text-gray-600 mb-1">
                                Entree (1):
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {entrees.map((item) => (
                                  <button
                                    key={item.id}
                                    onClick={() =>
                                      setCompletaEntree(
                                        day.num,
                                        cIndex,
                                        completa.entree?.id === item.id ? null : item
                                      )
                                    }
                                    className={`px-3 py-1.5 rounded-md text-sm ${
                                      completa.entree?.id === item.id
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
                              <p className="text-sm text-gray-600 mb-1">
                                Sides ({getTotalSideSlots(completa.sides)}/{SIDES_PER_COMPLETA}):
                              </p>
                              <div className="space-y-1">
                                {sides.map((sideItem) => {
                                  const existing = completa.sides.find(
                                    (s) => s.weeklyMenuItemId === sideItem.id
                                  );
                                  const qty = existing?.quantity || 0;
                                  const totalSlots = getTotalSideSlots(completa.sides);
                                  const canAdd = totalSlots < SIDES_PER_COMPLETA;
                                  const isDessert = sideItem.menuItem.isDessert;
                                  const isSoup = sideItem.menuItem.isSoup;
                                  const dessertCount = getDessertCount(completa.sides);
                                  const soupCount = getSoupCount(completa.sides);
                                  const dessertBlocked = isDessert && dessertCount >= 1 && qty === 0;
                                  const soupBlocked = isSoup && soupCount >= 1 && qty === 0;

                                  return (
                                    <div
                                      key={sideItem.id}
                                      className="flex items-center justify-between"
                                    >
                                      <span className={`text-sm ${
                                        isDessert ? "text-purple-700" : isSoup ? "text-amber-700" : "text-gray-700"
                                      }`}>
                                        {sideItem.menuItem.name}
                                        {isDessert && (
                                          <span className="text-xs ml-1">(dessert)</span>
                                        )}
                                        {isSoup && (
                                          <span className="text-xs ml-1">(soup)</span>
                                        )}
                                      </span>
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={() =>
                                            updateCompletaSide(day.num, cIndex, sideItem, -1)
                                          }
                                          disabled={qty === 0}
                                          className="w-8 h-8 rounded-full bg-gray-200 text-gray-900 text-lg font-bold disabled:opacity-30 hover:bg-gray-300 flex items-center justify-center"
                                        >
                                          −
                                        </button>
                                        <span className="w-6 text-center text-base font-semibold text-gray-900">
                                          {qty}
                                        </span>
                                        <button
                                          onClick={() =>
                                            updateCompletaSide(day.num, cIndex, sideItem, 1)
                                          }
                                          disabled={!canAdd || dessertBlocked || soupBlocked}
                                          className="w-8 h-8 rounded-full bg-gray-200 text-gray-900 text-lg font-bold disabled:opacity-30 hover:bg-gray-300 flex items-center justify-center"
                                        >
                                          +
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                            </>
                            )}
                          </div>
                        ))}

                        {/* Extra Entrees */}
                        {(daySel.extraEntrees.length > 0 || expandedExtras[day.num]?.entrees) && (
                          <div className="border border-blue-200 rounded-lg p-3 mb-3 bg-blue-50">
                            <div className="flex justify-between items-center mb-2">
                              <p className="font-medium text-blue-800">Extra Entrees</p>
                              {daySel.extraEntrees.length === 0 && (
                                <button
                                  onClick={() => toggleExpandedExtras(day.num, "entrees")}
                                  className="text-xs text-blue-600 hover:text-blue-800"
                                >
                                  Hide
                                </button>
                              )}
                            </div>
                            {entrees.map((item) => {
                              const existing = daySel.extraEntrees.find(
                                (e) => e.item.id === item.id
                              );
                              const qty = existing?.quantity || 0;
                              return (
                                <div key={item.id} className="flex items-center justify-between mb-1">
                                  <span className="text-sm text-gray-700">
                                    {item.menuItem.name}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => updateExtraEntree(day.num, item, -1)}
                                      disabled={qty === 0}
                                      className="w-8 h-8 rounded-full bg-gray-200 text-gray-900 text-lg font-bold disabled:opacity-30 hover:bg-gray-300 flex items-center justify-center"
                                    >
                                      −
                                    </button>
                                    <span className="w-6 text-center text-base font-semibold text-gray-900">{qty}</span>
                                    <button
                                      onClick={() => updateExtraEntree(day.num, item, 1)}
                                      className="w-8 h-8 rounded-full bg-gray-200 text-gray-900 text-lg font-bold hover:bg-gray-300 flex items-center justify-center"
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Extra Sides */}
                        {(daySel.extraSides.length > 0 || expandedExtras[day.num]?.sides) && (
                          <div className="border border-orange-200 rounded-lg p-3 mb-3 bg-orange-50">
                            <div className="flex justify-between items-center mb-2">
                              <p className="font-medium text-orange-800">Extra Sides</p>
                              {daySel.extraSides.length === 0 && (
                                <button
                                  onClick={() => toggleExpandedExtras(day.num, "sides")}
                                  className="text-xs text-orange-600 hover:text-orange-800"
                                >
                                  Hide
                                </button>
                              )}
                            </div>
                            {sides.map((sideItem) => {
                              const existing = daySel.extraSides.find(
                                (s) => s.weeklyMenuItemId === sideItem.id
                              );
                              const qty = existing?.quantity || 0;
                              return (
                                <div key={sideItem.id} className="flex items-center justify-between mb-1">
                                  <span className="text-sm text-gray-700">
                                    {sideItem.menuItem.name}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => updateExtraSide(day.num, sideItem, -1)}
                                      disabled={qty === 0}
                                      className="w-8 h-8 rounded-full bg-gray-200 text-gray-900 text-lg font-bold disabled:opacity-30 hover:bg-gray-300 flex items-center justify-center"
                                    >
                                      −
                                    </button>
                                    <span className="w-6 text-center text-base font-semibold text-gray-900">{qty}</span>
                                    <button
                                      onClick={() => updateExtraSide(day.num, sideItem, 1)}
                                      className="w-8 h-8 rounded-full bg-gray-200 text-gray-900 text-lg font-bold hover:bg-gray-300 flex items-center justify-center"
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Add Extras Buttons */}
                        <div className="flex gap-2 mt-2">
                          {daySel.extraEntrees.length === 0 && !expandedExtras[day.num]?.entrees && (
                            <button
                              onClick={() => toggleExpandedExtras(day.num, "entrees")}
                              className="px-3 py-1 text-xs text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50"
                            >
                              + Extra Entrees
                            </button>
                          )}
                          {daySel.extraSides.length === 0 && !expandedExtras[day.num]?.sides && (
                            <button
                              onClick={() => toggleExpandedExtras(day.num, "sides")}
                              className="px-3 py-1 text-xs text-orange-600 border border-orange-300 rounded-md hover:bg-orange-50"
                            >
                              + Extra Sides
                            </button>
                          )}
                        </div>
                      </>
                    )}

                    {!dayDisabled && !hasItems && (
                      <p className="text-sm text-gray-400">
                        Click &quot;+ Add Completa&quot; to start ordering for this day
                      </p>
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

                {orderableDays.length === 0 ? (
                  <p className="text-gray-500 text-sm">
                    Add items to build your order
                  </p>
                ) : (
                  <div className="space-y-3">
                    {orderableDays.map((dayNum) => {
                      const dayName = DAYS.find((d) => d.num === dayNum)!.name;
                      const daySel = getDaySelection(dayNum);
                      return (
                        <div key={dayNum} className="border-b border-gray-100 pb-3">
                          <p className="font-medium text-gray-900">{dayName}</p>
                          {daySel.completas.map((c, i) => (
                            <div key={i} className="text-sm text-gray-600 ml-2 mt-1">
                              <p className="font-medium">
                                Completa #{i + 1}
                                {!isCompletaComplete(c) && (
                                  <span className="text-yellow-600 ml-1">(incomplete)</span>
                                )}
                              </p>
                              {c.entree && <p className="ml-2">{c.entree.menuItem.name}</p>}
                              {c.sides.map((s, si) => (
                                <p key={si} className="ml-2 text-gray-500">
                                  + {s.quantity}x {s.name}
                                </p>
                              ))}
                            </div>
                          ))}
                          {daySel.extraEntrees.map((e, i) => (
                            <p key={`ee-${i}`} className="text-sm text-blue-600 ml-2">
                              Extra: {e.quantity}x {e.item.menuItem.name}
                            </p>
                          ))}
                          {daySel.extraSides.map((s, i) => (
                            <p key={`es-${i}`} className="text-sm text-orange-600 ml-2">
                              Extra: {s.quantity}x {s.name}
                            </p>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                )}

                <button
                  onClick={handleSubmitOrder}
                  disabled={orderableDays.length === 0}
                  className="w-full mt-4 bg-green-600 text-white py-3 rounded-md font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue to Checkout
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}