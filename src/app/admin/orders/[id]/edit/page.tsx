"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// ── Types ──

type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  type: "ENTREE" | "SIDE";
  isDessert: boolean;
  isSoup?: boolean;
  isStaple?: boolean;
};

type WeeklyMenuItem = {
  id: string;
  dayOfWeek: number;
  menuItem: MenuItem;
};

type SideSelection = {
  weeklyMenuItemId: string;
  menuItemId: string;
  name: string;
  isDessert: boolean;
  isSoup: boolean;
  quantity: number;
};

type Completa = {
  entree: WeeklyMenuItem | null;
  sides: SideSelection[];
};

type DaySelection = {
  completas: Completa[];
  extraEntrees: { item: WeeklyMenuItem; quantity: number }[];
  extraSides: SideSelection[];
};

type OrderSelections = { [dayOfWeek: number]: DaySelection };

type PricingConfig = {
  completaPrice: number;
  extraEntreePrice: number;
  extraSidePrice: number;
  deliveryFeePerMeal: number;
};

type Address = {
  id: string;
  street: string;
  unit: string | null;
  city: string;
  state: string;
  zipCode: string;
  deliveryNotes: string | null;
  isDefault?: boolean;
};

type CustomerResult = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  isCreditAccount: boolean;
  addresses: Address[];
};

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  customerId: string;
  weeklyMenuId: string;
  isPickup: boolean;
  addressId: string | null;
  notes: string | null;
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  orderDays: {
    id: string;
    dayOfWeek: number;
    orderItems: {
      id: string;
      menuItemId: string;
      quantity: number;
      unitPrice: number;
      isCompleta: boolean;
      completaGroupId: string | null;
      menuItem: MenuItem;
    }[];
  }[];
};

// ── Constants ──

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

// ── Main Component ──

export default function EditOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Order data
  const [order, setOrder] = useState<Order | null>(null);
  const [customer, setCustomer] = useState<CustomerResult | null>(null);
  const [weeklyMenuItems, setWeeklyMenuItems] = useState<WeeklyMenuItem[]>([]);
  const [stapleItems, setStapleItems] = useState<MenuItem[]>([]);
  const [pricing, setPricing] = useState<PricingConfig | null>(null);

  // Form state
  const [selections, setSelections] = useState<OrderSelections>({});
  const [isPickup, setIsPickup] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [orderNotes, setOrderNotes] = useState("");

  // UI state
  const [expandedCompletas, setExpandedCompletas] = useState<Set<string>>(new Set());
  const [expandedExtras, setExpandedExtras] = useState<Record<number, { entrees: boolean; sides: boolean }>>({});

  // Load order data
  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/orders/${id}`).then((res) => res.json()),
      fetch("/api/pricing").then((res) => res.json()),
      fetch("/api/admin/menu-items?stapleOnly=true").then((res) => res.json()).catch(() => []),
    ])
      .then(async ([orderData, pricingData, stapleData]) => {
        setOrder(orderData);
        setPricing(pricingData);
        setStapleItems(stapleData || []);
        setIsPickup(orderData.isPickup);
        setSelectedAddressId(orderData.addressId);
        setOrderNotes(orderData.notes || "");

        // Load weekly menu and customer
        const [menuData, customerData] = await Promise.all([
          fetch(`/api/admin/weekly-menus/${orderData.weeklyMenuId}`).then((res) => res.json()),
          fetch(`/api/admin/customers/${orderData.customerId}`).then((res) => res.json()),
        ]);

        setWeeklyMenuItems(menuData.menuItems || []);
        setCustomer(customerData);

        // Transform order to selections
        const transformed = transformOrderToSelections(orderData, menuData.menuItems || [], stapleData || []);
        setSelections(transformed);
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to load order data");
      })
      .finally(() => setLoading(false));
  }, [id]);

  // Transform order items back to selections structure
  function transformOrderToSelections(
    orderData: Order,
    menuItems: WeeklyMenuItem[],
    staples: MenuItem[]
  ): OrderSelections {
    const result: OrderSelections = {};

    for (const day of orderData.orderDays) {
      const daySelection: DaySelection = {
        completas: [],
        extraEntrees: [],
        extraSides: [],
      };

      // Group items by completaGroupId
      const completaGroups: Record<string, typeof day.orderItems> = {};
      const extras = day.orderItems.filter((item) => !item.isCompleta);

      day.orderItems.forEach((item) => {
        if (item.isCompleta && item.completaGroupId) {
          if (!completaGroups[item.completaGroupId]) {
            completaGroups[item.completaGroupId] = [];
          }
          completaGroups[item.completaGroupId].push(item);
        }
      });

      // Build completas
      Object.values(completaGroups).forEach((group) => {
        const entreeItem = group.find((item) => item.menuItem.type === "ENTREE");
        const sideItems = group.filter((item) => item.menuItem.type === "SIDE");

        if (entreeItem) {
          const entreeWeeklyItem = findOrCreateWeeklyMenuItem(
            entreeItem.menuItemId,
            day.dayOfWeek,
            menuItems,
            staples
          );

          const sides: SideSelection[] = sideItems.map((sideItem) => ({
            weeklyMenuItemId: findOrCreateWeeklyMenuItem(sideItem.menuItemId, day.dayOfWeek, menuItems, staples)?.id || `staple-${sideItem.menuItemId}`,
            menuItemId: sideItem.menuItemId,
            name: sideItem.menuItem.name,
            isDessert: sideItem.menuItem.isDessert,
            isSoup: sideItem.menuItem.isSoup || false,
            quantity: sideItem.quantity,
          }));

          daySelection.completas.push({
            entree: entreeWeeklyItem,
            sides,
          });
        }
      });

      // Build extras
      extras.forEach((item) => {
        const weeklyItem = findOrCreateWeeklyMenuItem(item.menuItemId, day.dayOfWeek, menuItems, staples);
        if (!weeklyItem) return;

        if (item.menuItem.type === "ENTREE") {
          daySelection.extraEntrees.push({
            item: weeklyItem,
            quantity: item.quantity,
          });
        } else {
          daySelection.extraSides.push({
            weeklyMenuItemId: weeklyItem.id,
            menuItemId: item.menuItemId,
            name: item.menuItem.name,
            isDessert: item.menuItem.isDessert,
            isSoup: item.menuItem.isSoup || false,
            quantity: item.quantity,
          });
        }
      });

      result[day.dayOfWeek] = daySelection;
    }

    return result;
  }

  function findOrCreateWeeklyMenuItem(
    menuItemId: string,
    dayOfWeek: number,
    menuItems: WeeklyMenuItem[],
    staples: MenuItem[]
  ): WeeklyMenuItem | null {
    // Try to find in weekly menu
    const found = menuItems.find(
      (item) => item.menuItem.id === menuItemId &&
      (item.dayOfWeek === dayOfWeek || item.dayOfWeek === 0)
    );
    if (found) return found;

    // Try to find in staples
    const staple = staples.find((item) => item.id === menuItemId);
    if (staple) {
      return {
        id: `staple-${staple.id}`,
        dayOfWeek: staple.type === "SIDE" ? 0 : dayOfWeek,
        menuItem: staple,
      };
    }

    return null;
  }

  // Order builder helpers
  function getDaySelection(dayOfWeek: number): DaySelection {
    return selections[dayOfWeek] || emptyDaySelection();
  }

  function getEntreesForDay(dayOfWeek: number): WeeklyMenuItem[] {
    const dayEntrees = weeklyMenuItems.filter(
      (item) => item.dayOfWeek === dayOfWeek && item.menuItem.type === "ENTREE"
    );

    const stapleEntrees: WeeklyMenuItem[] = stapleItems
      .filter((item) => item.type === "ENTREE")
      .map((item) => ({
        id: `staple-${item.id}`,
        dayOfWeek: dayOfWeek,
        menuItem: item,
      }));

    return [...stapleEntrees, ...dayEntrees];
  }

  function getSides(): WeeklyMenuItem[] {
    const menuSides = weeklyMenuItems.filter((item) => item.dayOfWeek === 0);

    const stapleSides: WeeklyMenuItem[] = stapleItems
      .filter((item) => item.type === "SIDE")
      .map((item) => ({
        id: `staple-${item.id}`,
        dayOfWeek: 0,
        menuItem: item,
      }));

    return [...stapleSides, ...menuSides];
  }

  function addCompleta(dayOfWeek: number) {
    setSelections((prev) => {
      const day = prev[dayOfWeek] || emptyDaySelection();
      return { ...prev, [dayOfWeek]: { ...day, completas: [...day.completas, emptyCompleta()] } };
    });
  }

  function removeCompleta(dayOfWeek: number, index: number) {
    setSelections((prev) => {
      const day = prev[dayOfWeek] || emptyDaySelection();
      return {
        ...prev,
        [dayOfWeek]: { ...day, completas: day.completas.filter((_, i) => i !== index) },
      };
    });
  }

  function setCompletaEntree(dayOfWeek: number, completaIndex: number, item: WeeklyMenuItem | null) {
    setSelections((prev) => {
      const day = prev[dayOfWeek] || emptyDaySelection();
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
      const day = prev[dayOfWeek] || emptyDaySelection();
      const completas = [...day.completas];
      const completa = { ...completas[completaIndex] };
      const sides = [...completa.sides];

      const existingIndex = sides.findIndex((s) => s.weeklyMenuItemId === weeklyMenuItem.id);

      if (existingIndex >= 0) {
        const newQuantity = sides[existingIndex].quantity + delta;
        if (newQuantity <= 0) {
          sides.splice(existingIndex, 1);
        } else {
          sides[existingIndex] = { ...sides[existingIndex], quantity: newQuantity };
        }
      } else if (delta > 0) {
        sides.push({
          weeklyMenuItemId: weeklyMenuItem.id,
          menuItemId: weeklyMenuItem.menuItem.id,
          name: weeklyMenuItem.menuItem.name,
          isDessert: weeklyMenuItem.menuItem.isDessert,
          isSoup: weeklyMenuItem.menuItem.isSoup || false,
          quantity: delta,
        });
      }

      completa.sides = sides;
      completas[completaIndex] = completa;
      return { ...prev, [dayOfWeek]: { ...day, completas } };
    });
  }

  function updateExtraEntree(dayOfWeek: number, item: WeeklyMenuItem, delta: number) {
    setSelections((prev) => {
      const day = prev[dayOfWeek] || emptyDaySelection();
      const extras = [...day.extraEntrees];
      const existingIndex = extras.findIndex((e) => e.item.id === item.id);

      if (existingIndex >= 0) {
        const newQuantity = extras[existingIndex].quantity + delta;
        if (newQuantity <= 0) {
          extras.splice(existingIndex, 1);
        } else {
          extras[existingIndex] = { ...extras[existingIndex], quantity: newQuantity };
        }
      } else if (delta > 0) {
        extras.push({ item, quantity: delta });
      }

      return { ...prev, [dayOfWeek]: { ...day, extraEntrees: extras } };
    });
  }

  function updateExtraSide(dayOfWeek: number, weeklyMenuItem: WeeklyMenuItem, delta: number) {
    setSelections((prev) => {
      const day = prev[dayOfWeek] || emptyDaySelection();
      const extras = [...day.extraSides];
      const existingIndex = extras.findIndex((s) => s.weeklyMenuItemId === weeklyMenuItem.id);

      if (existingIndex >= 0) {
        const newQuantity = extras[existingIndex].quantity + delta;
        if (newQuantity <= 0) {
          extras.splice(existingIndex, 1);
        } else {
          extras[existingIndex] = { ...extras[existingIndex], quantity: newQuantity };
        }
      } else if (delta > 0) {
        extras.push({
          weeklyMenuItemId: weeklyMenuItem.id,
          menuItemId: weeklyMenuItem.menuItem.id,
          name: weeklyMenuItem.menuItem.name,
          isDessert: weeklyMenuItem.menuItem.isDessert,
          isSoup: weeklyMenuItem.menuItem.isSoup || false,
          quantity: delta,
        });
      }

      return { ...prev, [dayOfWeek]: { ...day, extraSides: extras } };
    });
  }

  function removeDay(dayOfWeek: number) {
    setSelections((prev) => {
      const newSelections = { ...prev };
      delete newSelections[dayOfWeek];
      return newSelections;
    });
  }

  // Calculate totals
  function calculateTotals() {
    if (!pricing) return { subtotal: 0, deliveryFee: 0, totalAmount: 0, mealCount: 0 };

    let subtotal = 0;
    let totalMeals = 0;

    Object.values(selections).forEach((day) => {
      subtotal += day.completas.length * pricing.completaPrice;
      totalMeals += day.completas.length;

      day.extraEntrees.forEach((e) => {
        subtotal += e.quantity * pricing.extraEntreePrice;
        totalMeals += e.quantity;
      });

      day.extraSides.forEach((s) => {
        subtotal += s.quantity * pricing.extraSidePrice;
      });
    });

    const deliveryFee = isPickup ? 0 : totalMeals * pricing.deliveryFeePerMeal;
    const totalAmount = subtotal + deliveryFee;

    return { subtotal, deliveryFee, totalAmount, mealCount: totalMeals };
  }

  async function handleSubmit() {
    setError("");

    // Validate
    const selectedDays = Object.keys(selections).length;
    if (selectedDays < MIN_DAYS_PER_ORDER) {
      setError(`Minimum ${MIN_DAYS_PER_ORDER} days per order required`);
      return;
    }

    for (const [dayNum, day] of Object.entries(selections)) {
      if (day.completas.length === 0) {
        setError(`Each day must have at least 1 completa (Day ${DAYS.find(d => d.num === Number(dayNum))?.name})`);
        return;
      }
      for (const completa of day.completas) {
        if (!completa.entree) {
          setError("All completas must have an entree selected");
          return;
        }
        const sideSlots = getTotalSideSlots(completa.sides);
        if (sideSlots !== SIDES_PER_COMPLETA) {
          setError(`All completas must have exactly ${SIDES_PER_COMPLETA} sides`);
          return;
        }
      }
    }

    if (!isPickup && !selectedAddressId) {
      setError("Please select a delivery address");
      return;
    }

    // Build payload
    const orderDays = Object.entries(selections).map(([dayNum, day]) => ({
      dayOfWeek: Number(dayNum),
      completas: day.completas.map((c) => ({
        entreeId: c.entree!.menuItem.id,
        sides: c.sides.map((s) => ({ menuItemId: s.menuItemId, quantity: s.quantity })),
      })),
      extraEntrees: day.extraEntrees.map((e) => ({ menuItemId: e.item.menuItem.id, quantity: e.quantity })),
      extraSides: day.extraSides.map((s) => ({ menuItemId: s.menuItemId, quantity: s.quantity })),
    }));

    setSubmitting(true);

    try {
      const res = await fetch(`/api/admin/orders/${id}/edit`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderDays,
          isPickup,
          addressId: isPickup ? null : selectedAddressId,
          notes: orderNotes || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update order");
      }

      router.push(`/admin/orders/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update order");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!order || !customer || !pricing) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error || "Order not found"}</div>
          <Link href="/admin/orders" className="text-latin-orange hover:text-latin-red transition-colors">
            ← Back to orders
          </Link>
        </div>
      </div>
    );
  }

  if (order.status === "DELIVERED" || order.status === "CANCELLED") {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-yellow-100 text-yellow-800 p-4 rounded mb-4">
            This order cannot be edited because it has been {order.status.toLowerCase()}.
          </div>
          <Link href={`/admin/orders/${order.id}`} className="text-latin-orange hover:text-latin-red transition-colors">
            ← Back to order
          </Link>
        </div>
      </div>
    );
  }

  const { subtotal, deliveryFee, totalAmount, mealCount } = calculateTotals();
  const selectedDayCount = Object.keys(selections).length;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href={`/admin/orders/${order.id}`} className="text-latin-orange hover:text-latin-red transition-colors">
            ← Back to order
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mt-4">
            Edit Order {order.orderNumber}
          </h1>
          <p className="text-gray-600 mt-1">
            Customer: {customer.firstName} {customer.lastName}
          </p>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>
        )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Order Builder */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg text-gray-900 font-semibold mb-4">Order Items ({selectedDayCount} days selected)</h2>

            {DAYS.map((day) => {
              const daySelection = getDaySelection(day.num);
              const hasSelection = daySelection.completas.length > 0 ||
                                   daySelection.extraEntrees.length > 0 ||
                                   daySelection.extraSides.length > 0;

              return (
                <div key={day.num} className="mb-6 border-b pb-6 last:border-b-0">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900">{day.name}</h3>
                    {!hasSelection ? (
                      <button
                        onClick={() => addCompleta(day.num)}
                        className="text-sm text-latin-orange hover:text-latin-red transition-colors"
                      >
                        + Add day
                      </button>
                    ) : (
                      <button
                        onClick={() => removeDay(day.num)}
                        className="text-sm text-red-600 hover:text-red-800"
                      >
                        Remove day
                      </button>
                    )}
                  </div>

                  {hasSelection && (
                    <>
                      {/* Completas */}
                      <div className="space-y-3 mb-4">
                        {daySelection.completas.map((completa, idx) => {
                          const sideSlots = getTotalSideSlots(completa.sides);
                          const slotsRemaining = SIDES_PER_COMPLETA - sideSlots;
                          const dessertCount = getDessertCount(completa.sides);
                          const soupCount = getSoupCount(completa.sides);

                          return (
                            <div key={idx} className="border rounded-md p-4 bg-gray-50">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-sm text-gray-900">Completa #{idx + 1}</span>
                                <button
                                  onClick={() => removeCompleta(day.num, idx)}
                                  className="text-xs text-red-600 hover:text-red-800"
                                >
                                  Remove
                                </button>
                              </div>

                              {/* Entree selector */}
                              <div className="mb-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Entree</label>
                                <select
                                  value={completa.entree?.id || ""}
                                  onChange={(e) => {
                                    const item = getEntreesForDay(day.num).find((i) => i.id === e.target.value);
                                    setCompletaEntree(day.num, idx, item || null);
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                                >
                                  <option value="">Select entree...</option>
                                  {getEntreesForDay(day.num).map((item) => (
                                    <option key={item.id} value={item.id}>
                                      {item.menuItem.name}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {/* Sides */}
                              <div>
                                <div className="text-sm text-gray-600 mb-1">
                                  Sides ({sideSlots}/{SIDES_PER_COMPLETA})
                                  {slotsRemaining !== 0 && (
                                    <span className="ml-1 text-red-600">
                                      ({slotsRemaining > 0 ? `${slotsRemaining} more needed` : "too many!"})
                                    </span>
                                  )}
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  {getSides().map((sideItem) => {
                                    const existing = completa.sides.find((s) => s.weeklyMenuItemId === sideItem.id);
                                    const qty = existing?.quantity || 0;
                                    const canAdd = slotsRemaining > 0 &&
                                                   (!sideItem.menuItem.isDessert || dessertCount < 1) &&
                                                   (!sideItem.menuItem.isSoup || soupCount < 1);

                                    return (
                                      <div key={sideItem.id} className="flex items-center justify-between text-sm border border-gray-300 rounded-md px-2 py-1 bg-white">
                                        <span className="truncate text-gray-900">{sideItem.menuItem.name}</span>
                                        <div className="flex items-center gap-1">
                                          <button
                                            onClick={() => updateCompletaSide(day.num, idx, sideItem, -1)}
                                            disabled={qty === 0}
                                            className="w-6 h-6 rounded border border-gray-400 bg-white text-gray-700 font-semibold disabled:opacity-30 hover:bg-gray-100"
                                          >
                                            -
                                          </button>
                                          <span className="w-6 text-center text-gray-900">{qty}</span>
                                          <button
                                            onClick={() => updateCompletaSide(day.num, idx, sideItem, 1)}
                                            disabled={!canAdd}
                                            className="w-6 h-6 rounded border border-gray-400 bg-white text-gray-700 font-semibold disabled:opacity-30 hover:bg-gray-100"
                                          >
                                            +
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        <button
                          onClick={() => addCompleta(day.num)}
                          className="text-sm text-latin-orange hover:text-latin-red transition-colors"
                        >
                          + Add another completa
                        </button>
                      </div>

                      {/* Extra Entrees */}
                      <div className="mb-3">
                        <button
                          onClick={() => setExpandedExtras((prev) => ({
                            ...prev,
                            [day.num]: { ...prev[day.num], entrees: !prev[day.num]?.entrees },
                          }))}
                          className="text-sm font-medium text-gray-700 hover:text-gray-900"
                        >
                          Extra Entrees ({daySelection.extraEntrees.length}) {expandedExtras[day.num]?.entrees ? "−" : "+"}
                        </button>
                        {expandedExtras[day.num]?.entrees && (
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            {getEntreesForDay(day.num).map((item) => {
                              const existing = daySelection.extraEntrees.find((e) => e.item.id === item.id);
                              const qty = existing?.quantity || 0;

                              return (
                                <div key={item.id} className="flex items-center justify-between text-sm border border-gray-300 rounded-md px-2 py-1 bg-white">
                                  <span className="truncate text-gray-900">{item.menuItem.name}</span>
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => updateExtraEntree(day.num, item, -1)}
                                      disabled={qty === 0}
                                      className="w-6 h-6 rounded border border-gray-400 bg-white text-gray-700 font-semibold disabled:opacity-30 hover:bg-gray-100"
                                    >
                                      -
                                    </button>
                                    <span className="w-6 text-center text-gray-900">{qty}</span>
                                    <button
                                      onClick={() => updateExtraEntree(day.num, item, 1)}
                                      className="w-6 h-6 rounded border border-gray-400 bg-white text-gray-700 font-semibold hover:bg-gray-100"
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Extra Sides */}
                      <div>
                        <button
                          onClick={() => setExpandedExtras((prev) => ({
                            ...prev,
                            [day.num]: { ...prev[day.num], sides: !prev[day.num]?.sides },
                          }))}
                          className="text-sm font-medium text-gray-700 hover:text-gray-900"
                        >
                          Extra Sides ({daySelection.extraSides.length}) {expandedExtras[day.num]?.sides ? "−" : "+"}
                        </button>
                        {expandedExtras[day.num]?.sides && (
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            {getSides().map((item) => {
                              const existing = daySelection.extraSides.find((s) => s.weeklyMenuItemId === item.id);
                              const qty = existing?.quantity || 0;

                              return (
                                <div key={item.id} className="flex items-center justify-between text-sm border border-gray-300 rounded-md px-2 py-1 bg-white">
                                  <span className="truncate text-gray-900">{item.menuItem.name}</span>
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => updateExtraSide(day.num, item, -1)}
                                      disabled={qty === 0}
                                      className="w-6 h-6 rounded border border-gray-400 bg-white text-gray-700 font-semibold disabled:opacity-30 hover:bg-gray-100"
                                    >
                                      -
                                    </button>
                                    <span className="w-6 text-center text-gray-900">{qty}</span>
                                    <button
                                      onClick={() => updateExtraSide(day.num, item, 1)}
                                      className="w-6 h-6 rounded border border-gray-400 bg-white text-gray-700 font-semibold hover:bg-gray-100"
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Sidebar */}
        <div className="space-y-6">
          {/* Customer Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-2">Customer</h3>
            <div className="text-sm text-gray-600">
              <div>{customer.firstName} {customer.lastName}</div>
              {customer.email && <div>{customer.email}</div>}
              {customer.phone && <div>{customer.phone}</div>}
            </div>
          </div>

          {/* Delivery */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-3">Delivery</h3>

            <label className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                checked={isPickup}
                onChange={(e) => {
                  setIsPickup(e.target.checked);
                  if (e.target.checked) setSelectedAddressId(null);
                }}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span className="text-sm font-medium text-gray-700">Pickup</span>
            </label>

            {!isPickup && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Address</label>
                <select
                  value={selectedAddressId || ""}
                  onChange={(e) => setSelectedAddressId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                >
                  <option value="">Select address...</option>
                  {customer.addresses.map((addr) => (
                    <option key={addr.id} value={addr.id}>
                      {addr.street} {addr.unit ? `#${addr.unit}` : ""}, {addr.city}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-3">Notes</h3>
            <textarea
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
              rows={3}
              placeholder="Order notes..."
            />
          </div>

          {/* Pricing */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-3">Summary</h3>
            <div className="space-y-2 text-gray-900 text-sm">
              <div className="flex justify-between">
                <span>Original Total:</span>
                <span className="font-medium">${Number(order.totalAmount).toFixed(2)}</span>
              </div>
              <div className="border-t pt-2">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal:</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Delivery Fee ({mealCount} meals):</span>
                  <span>${deliveryFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold text-lg mt-2">
                  <span>New Total:</span>
                  <span>${totalAmount.toFixed(2)}</span>
                </div>
                {totalAmount !== Number(order.totalAmount) && (
                  <div className="text-xs text-gray-500 mt-1">
                    Difference: {totalAmount > Number(order.totalAmount) ? "+" : ""}
                    ${(totalAmount - Number(order.totalAmount)).toFixed(2)}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <button
              onClick={handleSubmit}
              disabled={submitting || selectedDayCount < MIN_DAYS_PER_ORDER}
              className="w-full px-6 py-3 bg-latin-orange text-white rounded-full font-semibold hover:bg-latin-red disabled:opacity-50 uppercase transition-colors"
            >
              {submitting ? "SAVING..." : "SAVE CHANGES"}
            </button>
            <Link
              href={`/admin/orders/${order.id}`}
              className="block w-full text-center px-4 py-3 bg-gray-200 text-gray-700 rounded-md font-medium hover:bg-gray-300"
            >
              CANCEL
            </Link>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
