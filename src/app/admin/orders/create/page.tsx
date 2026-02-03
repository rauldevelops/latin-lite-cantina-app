"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { formatPhoneNumber } from "@/lib/formatPhone";

// ── Types ──

type CustomerResult = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  isCreditAccount: boolean;
  addresses: Address[];
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

type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  type: "ENTREE" | "SIDE";
  isDessert: boolean;
};

type WeeklyMenuItem = {
  id: string;
  dayOfWeek: number;
  menuItem: MenuItem;
};

type WeeklyMenu = {
  id: string;
  weekStartDate: string;
  isPublished: boolean;
  menuItems: WeeklyMenuItem[];
};

type SideSelection = {
  weeklyMenuItemId: string;
  menuItemId: string;
  name: string;
  isDessert: boolean;
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

// ── Component ──

export default function AdminCreateOrderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Step 1: Customer
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<CustomerResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerResult | null>(null);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    firstName: "", lastName: "", email: "", phone: "",
    isCreditAccount: false,
    street: "", unit: "", city: "", state: "", zipCode: "", deliveryNotes: "",
  });
  const [creatingCustomer, setCreatingCustomer] = useState(false);

  // Step 2: Order Builder
  const [menus, setMenus] = useState<WeeklyMenu[]>([]);
  const [selectedMenuIndex, setSelectedMenuIndex] = useState(0);
  const [selections, setSelections] = useState<OrderSelections>({});
  const [expandedCompletas, setExpandedCompletas] = useState<Set<string>>(new Set());
  const [expandedExtras, setExpandedExtras] = useState<Record<number, { entrees: boolean; sides: boolean }>>({});
  const [menusLoading, setMenusLoading] = useState(false);

  // Step 3: Delivery & Payment
  const [isPickup, setIsPickup] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paymentStatus, setPaymentStatus] = useState("PENDING");
  const [orderNotes, setOrderNotes] = useState("");

  // Step 3: Pricing
  const [pricing, setPricing] = useState<PricingConfig | null>(null);

  // Pre-select customer from query param
  useEffect(() => {
    const customerId = searchParams.get("customerId");
    if (customerId) {
      fetch(`/api/admin/customers/${customerId}`)
        .then((res) => {
          if (res.ok) return res.json();
          return null;
        })
        .then((data) => {
          if (data) {
            setSelectedCustomer({
              id: data.id,
              firstName: data.firstName,
              lastName: data.lastName,
              email: data.email,
              phone: data.phone,
              isCreditAccount: data.isCreditAccount,
              addresses: data.addresses || [],
            });
            if (data.isCreditAccount) {
              setPaymentMethod("CREDIT_ACCOUNT");
              setPaymentStatus("CREDIT_ACCOUNT");
            }
          }
        });
    }
  }, [searchParams]);

  // Fetch menus when entering step 2
  useEffect(() => {
    if (step === 2 && menus.length === 0) {
      setMenusLoading(true);
      fetch("/api/admin/weekly-menus")
        .then((res) => res.json())
        .then(async (menuList: { id: string; weekStartDate: string; isPublished: boolean }[]) => {
          const published = menuList.filter((m) => m.isPublished);
          const detailed = await Promise.all(
            published.map(async (m) => {
              const res = await fetch(`/api/admin/weekly-menus/${m.id}`);
              return res.json();
            })
          );
          setMenus(detailed);
        })
        .catch(() => setError("Failed to load menus"))
        .finally(() => setMenusLoading(false));
    }
  }, [step, menus.length]);

  // Fetch pricing when entering step 3
  useEffect(() => {
    if (step === 3 && !pricing) {
      fetch("/api/pricing")
        .then((res) => res.json())
        .then(setPricing)
        .catch(() => setError("Failed to load pricing"));
    }
  }, [step, pricing]);

  // ── Customer Search ──

  const searchCustomers = useCallback(async () => {
    if (!customerSearch.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/admin/customers?search=${encodeURIComponent(customerSearch)}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCustomerResults(data);
    } catch {
      setError("Failed to search customers");
    } finally {
      setSearching(false);
    }
  }, [customerSearch]);

  async function selectCustomer(c: CustomerResult) {
    // Fetch full customer detail to get addresses
    try {
      const res = await fetch(`/api/admin/customers/${c.id}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSelectedCustomer({
        id: data.id,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        isCreditAccount: data.isCreditAccount,
        addresses: data.addresses || [],
      });
      if (data.isCreditAccount) {
        setPaymentMethod("CREDIT_ACCOUNT");
        setPaymentStatus("CREDIT_ACCOUNT");
      }
    } catch {
      setError("Failed to load customer details");
    }
  }

  async function createNewCustomer() {
    if (!newCustomer.firstName || !newCustomer.lastName) {
      setError("First name and last name are required.");
      return;
    }
    setCreatingCustomer(true);
    setError("");
    try {
      const hasAddress = newCustomer.street.trim() !== "";
      const res = await fetch("/api/admin/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: newCustomer.firstName,
          lastName: newCustomer.lastName,
          email: newCustomer.email || null,
          phone: newCustomer.phone || null,
          isCreditAccount: newCustomer.isCreditAccount,
          address: hasAddress
            ? {
                street: newCustomer.street,
                unit: newCustomer.unit || null,
                city: newCustomer.city,
                state: newCustomer.state,
                zipCode: newCustomer.zipCode,
                deliveryNotes: newCustomer.deliveryNotes || null,
              }
            : null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create customer");
      }
      const created = await res.json();
      setSelectedCustomer({
        id: created.id,
        firstName: created.firstName,
        lastName: created.lastName,
        email: created.email,
        phone: created.phone,
        isCreditAccount: created.isCreditAccount,
        addresses: created.addresses || [],
      });
      if (created.isCreditAccount) {
        setPaymentMethod("CREDIT_ACCOUNT");
        setPaymentStatus("CREDIT_ACCOUNT");
      }
      setShowNewCustomerForm(false);
      setNewCustomer({
        firstName: "", lastName: "", email: "", phone: "",
        isCreditAccount: false,
        street: "", unit: "", city: "", state: "", zipCode: "", deliveryNotes: "",
      });
    } catch (err) {
      setError(`${err instanceof Error ? err.message : "Failed to create customer"}`);
    } finally {
      setCreatingCustomer(false);
    }
  }

  // ── Order Builder Helpers ──

  function getDaySelection(dayOfWeek: number): DaySelection {
    return selections[dayOfWeek] || emptyDaySelection();
  }

  function getDaySelectionFromPrev(prev: OrderSelections, dayOfWeek: number): DaySelection {
    return prev[dayOfWeek] || emptyDaySelection();
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

  function addCompleta(dayOfWeek: number) {
    setSelections((prev) => {
      const day = getDaySelectionFromPrev(prev, dayOfWeek);
      return { ...prev, [dayOfWeek]: { ...day, completas: [...day.completas, emptyCompleta()] } };
    });
  }

  function removeCompleta(dayOfWeek: number, index: number) {
    setSelections((prev) => {
      const day = getDaySelectionFromPrev(prev, dayOfWeek);
      return {
        ...prev,
        [dayOfWeek]: { ...day, completas: day.completas.filter((_, i) => i !== index) },
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

      const existingIndex = sides.findIndex((s) => s.weeklyMenuItemId === weeklyMenuItem.id);
      if (existingIndex >= 0) {
        const newQty = sides[existingIndex].quantity + delta;
        if (newQty <= 0) sides.splice(existingIndex, 1);
        else sides[existingIndex] = { ...sides[existingIndex], quantity: newQty };
      } else if (delta > 0) {
        sides.push({
          weeklyMenuItemId: weeklyMenuItem.id,
          menuItemId: weeklyMenuItem.menuItem.id,
          name: weeklyMenuItem.menuItem.name,
          isDessert: weeklyMenuItem.menuItem.isDessert,
          quantity: 1,
        });
      }

      if (getTotalSideSlots(sides) > SIDES_PER_COMPLETA) return prev;
      if (getDessertCount(sides) > 1) return prev;

      completa.sides = sides;
      completas[completaIndex] = completa;
      return { ...prev, [dayOfWeek]: { ...day, completas } };
    });
  }

  function removeCompletaSide(dayOfWeek: number, completaIndex: number, weeklyMenuItemId: string) {
    setSelections((prev) => {
      const day = getDaySelectionFromPrev(prev, dayOfWeek);
      const completas = [...day.completas];
      const completa = { ...completas[completaIndex] };
      completa.sides = completa.sides.filter((s) => s.weeklyMenuItemId !== weeklyMenuItemId);
      completas[completaIndex] = completa;
      return { ...prev, [dayOfWeek]: { ...day, completas } };
    });
  }

  function updateExtraEntree(dayOfWeek: number, item: WeeklyMenuItem, delta: number) {
    setSelections((prev) => {
      const day = getDaySelectionFromPrev(prev, dayOfWeek);
      const extras = [...day.extraEntrees];
      const idx = extras.findIndex((e) => e.item.id === item.id);
      if (idx >= 0) {
        const newQty = extras[idx].quantity + delta;
        if (newQty <= 0) extras.splice(idx, 1);
        else extras[idx] = { ...extras[idx], quantity: newQty };
      } else if (delta > 0) {
        extras.push({ item, quantity: 1 });
      }
      return { ...prev, [dayOfWeek]: { ...day, extraEntrees: extras } };
    });
  }

  function updateExtraSide(dayOfWeek: number, weeklyMenuItem: WeeklyMenuItem, delta: number) {
    setSelections((prev) => {
      const day = getDaySelectionFromPrev(prev, dayOfWeek);
      const extras = [...day.extraSides];
      const idx = extras.findIndex((s) => s.weeklyMenuItemId === weeklyMenuItem.id);
      if (idx >= 0) {
        const newQty = extras[idx].quantity + delta;
        if (newQty <= 0) extras.splice(idx, 1);
        else extras[idx] = { ...extras[idx], quantity: newQty };
      } else if (delta > 0) {
        extras.push({
          weeklyMenuItemId: weeklyMenuItem.id,
          menuItemId: weeklyMenuItem.menuItem.id,
          name: weeklyMenuItem.menuItem.name,
          isDessert: weeklyMenuItem.menuItem.isDessert,
          quantity: 1,
        });
      }
      return { ...prev, [dayOfWeek]: { ...day, extraSides: extras } };
    });
  }

  function isCompletaComplete(completa: Completa): boolean {
    return completa.entree !== null && getTotalSideSlots(completa.sides) === SIDES_PER_COMPLETA;
  }

  function dayHasSelections(dayOfWeek: number): boolean {
    const day = getDaySelection(dayOfWeek);
    return day.completas.length > 0 || day.extraEntrees.length > 0 || day.extraSides.length > 0;
  }

  function getOrderableDays(): number[] {
    return DAYS.filter((day) => dayHasSelections(day.num)).map((day) => day.num);
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

  // ── Pricing ──

  function calculateTotals() {
    if (!pricing) return { subtotal: 0, deliveryFee: 0, total: 0 };
    const orderableDays = getOrderableDays();
    let subtotal = 0;
    let totalMeals = 0;
    for (const dayNum of orderableDays) {
      const day = getDaySelection(dayNum);
      subtotal += day.completas.length * pricing.completaPrice;
      totalMeals += day.completas.length;
      for (const e of day.extraEntrees) {
        subtotal += e.quantity * pricing.extraEntreePrice;
        totalMeals += e.quantity;
      }
      for (const s of day.extraSides) {
        subtotal += s.quantity * pricing.extraSidePrice;
      }
    }
    const deliveryFee = isPickup ? 0 : totalMeals * pricing.deliveryFeePerMeal;
    return { subtotal, deliveryFee, total: subtotal + deliveryFee };
  }

  // ── Validation & Submit ──

  function validateStep2(): boolean {
    const orderableDays = getOrderableDays();
    if (orderableDays.length < MIN_DAYS_PER_ORDER) {
      setError(`Minimum ${MIN_DAYS_PER_ORDER} days required. Currently: ${orderableDays.length}`);
      return false;
    }
    for (const dayNum of orderableDays) {
      const dayName = DAYS.find((d) => d.num === dayNum)?.name;
      const day = getDaySelection(dayNum);
      if (day.completas.length === 0) {
        setError(`${dayName} needs at least 1 completa.`);
        return false;
      }
      for (let i = 0; i < day.completas.length; i++) {
        if (!isCompletaComplete(day.completas[i])) {
          setError(`${dayName} Completa #${i + 1} is incomplete.`);
          return false;
        }
      }
    }
    return true;
  }

  function validateStep3(): boolean {
    if (!isPickup && !selectedAddressId) {
      setError("Please select a delivery address.");
      return false;
    }
    return true;
  }

  async function handleSubmit() {
    if (!selectedCustomer) return;
    setSubmitting(true);
    setError("");

    const orderableDays = getOrderableDays();
    const menu = menus[selectedMenuIndex];

    const orderDays = orderableDays.map((dayOfWeek) => {
      const day = getDaySelection(dayOfWeek);
      return {
        dayOfWeek,
        completas: day.completas.map((c) => ({
          entreeId: c.entree!.menuItem.id,
          sides: c.sides.map((s) => ({ menuItemId: s.menuItemId, quantity: s.quantity })),
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

    try {
      const res = await fetch("/api/admin/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: selectedCustomer.id,
          weeklyMenuId: menu.id,
          orderDays,
          isPickup,
          addressId: isPickup ? null : selectedAddressId,
          paymentMethod,
          paymentStatus,
          notes: orderNotes || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create order");
      }

      const order = await res.json();
      router.push(`/admin/orders/${order.id}`);
    } catch (err) {
      setError(`${err}`);
    } finally {
      setSubmitting(false);
    }
  }

  function formatWeekRange(dateString: string): string {
    const monday = new Date(dateString);
    const friday = new Date(monday);
    friday.setDate(friday.getDate() + 4);
    const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
    return `${monday.toLocaleDateString("en-US", options)} - ${friday.toLocaleDateString("en-US", options)}, ${monday.getFullYear()}`;
  }

  // ── Render ──

  const sides = getSides();
  const orderableDays = getOrderableDays();
  const totals = calculateTotals();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Link href="/admin/orders" className="text-blue-600 hover:text-blue-800 text-sm">
            &larr; Back to Orders
          </Link>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-6">Create Order</h1>

        {/* Step Indicator */}
        <div className="flex gap-2 mb-6">
          {["Customer", "Build Order", "Delivery & Payment", "Review"].map((label, i) => (
            <div
              key={i}
              className={`flex-1 text-center py-2 rounded-md text-sm font-medium ${
                step === i + 1
                  ? "bg-green-600 text-white"
                  : step > i + 1
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {label}
            </div>
          ))}
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>
        )}

        {/* ── Step 1: Customer Selection ── */}
        {step === 1 && (
          <div className="space-y-4">
            {selectedCustomer ? (
              <div className="bg-white shadow rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {selectedCustomer.firstName} {selectedCustomer.lastName}
                      {selectedCustomer.isCreditAccount && (
                        <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800">
                          Credit
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-gray-600">
                      {selectedCustomer.email || "No email"} | {selectedCustomer.phone || "No phone"}
                    </p>
                    <p className="text-sm text-gray-500">
                      {selectedCustomer.addresses.length} address(es) on file
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedCustomer(null)}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    Change
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="bg-white shadow rounded-lg p-4">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      searchCustomers();
                    }}
                    className="flex gap-2"
                  >
                    <input
                      type="text"
                      placeholder="Search by name, email, or phone..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-400"
                    />
                    <button
                      type="submit"
                      disabled={searching}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      {searching ? "..." : "Search"}
                    </button>
                  </form>
                </div>

                {customerResults.length > 0 && !showNewCustomerForm && (
                  <div className="bg-white shadow rounded-lg divide-y">
                    {customerResults.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => selectCustomer(c)}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50"
                      >
                        <p className="font-medium text-gray-900">
                          {c.firstName} {c.lastName}
                          {c.isCreditAccount && (
                            <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800">
                              Credit
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-gray-600">
                          {c.email || "No email"} | {c.phone || "No phone"}
                        </p>
                      </button>
                    ))}
                  </div>
                )}

                {!showNewCustomerForm ? (
                  <button
                    onClick={() => setShowNewCustomerForm(true)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    + New Customer
                  </button>
                ) : (
                  <div className="bg-white shadow rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <h3 className="font-semibold text-gray-900">New Customer</h3>
                      <button
                        onClick={() => setShowNewCustomerForm(false)}
                        className="text-sm text-gray-500 hover:text-gray-700"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="First name *"
                        value={newCustomer.firstName}
                        onChange={(e) => setNewCustomer({ ...newCustomer, firstName: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-md text-gray-900 text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Last name *"
                        value={newCustomer.lastName}
                        onChange={(e) => setNewCustomer({ ...newCustomer, lastName: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-md text-gray-900 text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="email"
                        placeholder="Email (optional)"
                        value={newCustomer.email}
                        onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-md text-gray-900 text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Phone (optional)"
                        value={newCustomer.phone}
                        onChange={(e) => setNewCustomer({ ...newCustomer, phone: formatPhoneNumber(e.target.value) })}
                        className="px-3 py-2 border border-gray-300 rounded-md text-gray-900 text-sm"
                      />
                    </div>

                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={newCustomer.isCreditAccount}
                        onChange={(e) => setNewCustomer({ ...newCustomer, isCreditAccount: e.target.checked })}
                        className="rounded border-gray-300"
                      />
                      Credit account
                    </label>

                    <div className="border-t pt-3">
                      <p className="text-sm text-gray-600 mb-2">Address (optional)</p>
                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="Street"
                          value={newCustomer.street}
                          onChange={(e) => setNewCustomer({ ...newCustomer, street: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 text-sm"
                        />
                        <input
                          type="text"
                          placeholder="Unit / Apt (optional)"
                          value={newCustomer.unit}
                          onChange={(e) => setNewCustomer({ ...newCustomer, unit: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 text-sm"
                        />
                        <div className="grid grid-cols-3 gap-2">
                          <input
                            type="text"
                            placeholder="City"
                            value={newCustomer.city}
                            onChange={(e) => setNewCustomer({ ...newCustomer, city: e.target.value })}
                            className="px-3 py-2 border border-gray-300 rounded-md text-gray-900 text-sm"
                          />
                          <input
                            type="text"
                            placeholder="State"
                            value={newCustomer.state}
                            onChange={(e) => setNewCustomer({ ...newCustomer, state: e.target.value })}
                            className="px-3 py-2 border border-gray-300 rounded-md text-gray-900 text-sm"
                          />
                          <input
                            type="text"
                            placeholder="ZIP"
                            value={newCustomer.zipCode}
                            onChange={(e) => setNewCustomer({ ...newCustomer, zipCode: e.target.value })}
                            className="px-3 py-2 border border-gray-300 rounded-md text-gray-900 text-sm"
                          />
                        </div>
                        <textarea
                          placeholder="Delivery notes (optional)"
                          value={newCustomer.deliveryNotes}
                          onChange={(e) => setNewCustomer({ ...newCustomer, deliveryNotes: e.target.value })}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 text-sm"
                        />
                      </div>
                    </div>

                    <button
                      onClick={createNewCustomer}
                      disabled={creatingCustomer || !newCustomer.firstName || !newCustomer.lastName}
                      className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
                    >
                      {creatingCustomer ? "Creating..." : "Create & Select Customer"}
                    </button>
                  </div>
                )}
              </>
            )}

            <button
              onClick={() => {
                setError("");
                if (!selectedCustomer) {
                  setError("Please select a customer first.");
                  return;
                }
                setStep(2);
              }}
              disabled={!selectedCustomer}
              className="ml-2 px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              Next: Build Order
            </button>
          </div>
        )}

        {/* ── Step 2: Order Builder ── */}
        {step === 2 && (
          <div>
            {menusLoading ? (
              <p>Loading menus...</p>
            ) : menus.length === 0 ? (
              <p className="text-gray-500">No published menus available.</p>
            ) : (
              <>
                {/* Menu selector */}
                <div className="bg-white shadow rounded-lg p-4 mb-4">
                  <label className="block text-sm text-gray-600 mb-1">Week</label>
                  <select
                    value={selectedMenuIndex}
                    onChange={(e) => {
                      setSelectedMenuIndex(Number(e.target.value));
                      setSelections({});
                    }}
                    className="w-full sm:w-80 px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                  >
                    {menus.map((menu, i) => (
                      <option key={menu.id} value={i}>
                        {formatWeekRange(menu.weekStartDate)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-4">
                    {DAYS.map((day) => {
                      const entrees = getEntreesForDay(day.num);
                      const daySel = getDaySelection(day.num);
                      const hasItems = dayHasSelections(day.num);

                      return (
                        <div key={day.num} className="bg-white rounded-lg shadow p-4">
                          <div className="flex justify-between items-center mb-3">
                            <h3 className="text-lg font-semibold text-gray-900">{day.name}</h3>
                            <button
                              onClick={() => addCompleta(day.num)}
                              className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
                            >
                              + Add Completa
                            </button>
                          </div>

                          {hasItems && (
                            <>
                              {daySel.completas.map((completa, cIndex) => (
                                <div
                                  key={cIndex}
                                  className={`border rounded-lg p-3 mb-3 ${
                                    isCompletaComplete(completa) ? "border-green-300 bg-green-50" : "border-gray-200"
                                  }`}
                                >
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="font-medium text-gray-800">
                                      Completa #{cIndex + 1}
                                      {isCompletaComplete(completa) && (
                                        <span className="ml-2 text-green-600 text-sm">&#10003;</span>
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

                                  {/* Selection badges */}
                                  {(completa.entree || completa.sides.length > 0) && (
                                    <div className="flex flex-wrap gap-2 mb-3">
                                      {completa.entree && (
                                        <span className="px-3 py-1.5 rounded-md text-sm bg-green-600 text-white">
                                          {completa.entree.menuItem.name}
                                        </span>
                                      )}
                                      {completa.sides.map((s) => (
                                        <span
                                          key={s.weeklyMenuItemId}
                                          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-sm ${
                                            s.isDessert ? "bg-purple-100 text-purple-800" : "bg-green-100 text-green-800"
                                          }`}
                                        >
                                          {s.quantity > 1 && `${s.quantity}x `}{s.name}
                                          <button
                                            onClick={() => removeCompletaSide(day.num, cIndex, s.weeklyMenuItemId)}
                                            className="ml-0.5 hover:text-red-600 font-bold"
                                          >
                                            &times;
                                          </button>
                                        </span>
                                      ))}
                                    </div>
                                  )}

                                  {(!isCompletaComplete(completa) || isCompletaExpanded(day.num, cIndex)) && (
                                    <>
                                      <div className="mb-3">
                                        <p className="text-sm text-gray-600 mb-1">Entree (1):</p>
                                        <div className="flex flex-wrap gap-2">
                                          {entrees.map((item) => (
                                            <button
                                              key={item.id}
                                              onClick={() =>
                                                setCompletaEntree(day.num, cIndex, completa.entree?.id === item.id ? null : item)
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
                                      <div>
                                        <p className="text-sm text-gray-600 mb-1">
                                          Sides ({getTotalSideSlots(completa.sides)}/{SIDES_PER_COMPLETA}):
                                        </p>
                                        <div className="space-y-1">
                                          {sides.map((sideItem) => {
                                            const existing = completa.sides.find((s) => s.weeklyMenuItemId === sideItem.id);
                                            const qty = existing?.quantity || 0;
                                            const canAdd = getTotalSideSlots(completa.sides) < SIDES_PER_COMPLETA;
                                            const isDessert = sideItem.menuItem.isDessert;
                                            const dessertBlocked = isDessert && getDessertCount(completa.sides) >= 1 && qty === 0;

                                            return (
                                              <div key={sideItem.id} className="flex items-center justify-between">
                                                <span className={`text-sm ${isDessert ? "text-purple-700" : "text-gray-700"}`}>
                                                  {sideItem.menuItem.name}
                                                  {isDessert && <span className="text-xs ml-1">(dessert)</span>}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                  <button
                                                    onClick={() => updateCompletaSide(day.num, cIndex, sideItem, -1)}
                                                    disabled={qty === 0}
                                                    className="w-8 h-8 rounded-full bg-gray-200 text-gray-900 text-lg font-bold disabled:opacity-30 hover:bg-gray-300 flex items-center justify-center"
                                                  >
                                                    &minus;
                                                  </button>
                                                  <span className="w-6 text-center text-base font-semibold text-gray-900">{qty}</span>
                                                  <button
                                                    onClick={() => updateCompletaSide(day.num, cIndex, sideItem, 1)}
                                                    disabled={!canAdd || dessertBlocked}
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
                                  {getEntreesForDay(day.num).map((item) => {
                                    const existing = daySel.extraEntrees.find((e) => e.item.id === item.id);
                                    const qty = existing?.quantity || 0;
                                    return (
                                      <div key={item.id} className="flex items-center justify-between mb-1">
                                        <span className="text-sm text-gray-700">{item.menuItem.name}</span>
                                        <div className="flex items-center gap-2">
                                          <button onClick={() => updateExtraEntree(day.num, item, -1)} disabled={qty === 0} className="w-8 h-8 rounded-full bg-gray-200 text-gray-900 text-lg font-bold disabled:opacity-30 hover:bg-gray-300 flex items-center justify-center">&minus;</button>
                                          <span className="w-6 text-center text-base font-semibold text-gray-900">{qty}</span>
                                          <button onClick={() => updateExtraEntree(day.num, item, 1)} className="w-8 h-8 rounded-full bg-gray-200 text-gray-900 text-lg font-bold hover:bg-gray-300 flex items-center justify-center">+</button>
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
                                    const existing = daySel.extraSides.find((s) => s.weeklyMenuItemId === sideItem.id);
                                    const qty = existing?.quantity || 0;
                                    return (
                                      <div key={sideItem.id} className="flex items-center justify-between mb-1">
                                        <span className="text-sm text-gray-700">{sideItem.menuItem.name}</span>
                                        <div className="flex items-center gap-2">
                                          <button onClick={() => updateExtraSide(day.num, sideItem, -1)} disabled={qty === 0} className="w-8 h-8 rounded-full bg-gray-200 text-gray-900 text-lg font-bold disabled:opacity-30 hover:bg-gray-300 flex items-center justify-center">&minus;</button>
                                          <span className="w-6 text-center text-base font-semibold text-gray-900">{qty}</span>
                                          <button onClick={() => updateExtraSide(day.num, sideItem, 1)} className="w-8 h-8 rounded-full bg-gray-200 text-gray-900 text-lg font-bold hover:bg-gray-300 flex items-center justify-center">+</button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Add Extras */}
                              <div className="flex gap-2 mt-2">
                                {daySel.extraEntrees.length === 0 && !expandedExtras[day.num]?.entrees && getEntreesForDay(day.num).length > 0 && (
                                  <button
                                    onClick={() => toggleExpandedExtras(day.num, "entrees")}
                                    className="px-3 py-1 text-xs text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50"
                                  >
                                    + Extra Entrees
                                  </button>
                                )}
                                {daySel.extraSides.length === 0 && !expandedExtras[day.num]?.sides && sides.length > 0 && (
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

                          {!hasItems && (
                            <p className="text-sm text-gray-400">
                              Click &quot;+ Add Completa&quot; to start ordering for this day
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Summary sidebar */}
                  <div>
                    <div className="bg-white rounded-lg shadow p-4 sticky top-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Summary</h3>
                      <p className="text-sm text-gray-600 mb-2">
                        Customer: {selectedCustomer?.firstName} {selectedCustomer?.lastName}
                      </p>
                      {orderableDays.length === 0 ? (
                        <p className="text-gray-500 text-sm">Add items to build the order</p>
                      ) : (
                        <div className="space-y-2">
                          {orderableDays.map((dayNum) => {
                            const dayName = DAYS.find((d) => d.num === dayNum)!.name;
                            const daySel = getDaySelection(dayNum);
                            return (
                              <div key={dayNum} className="border-b border-gray-100 pb-2">
                                <p className="font-medium text-gray-900 text-sm">{dayName}</p>
                                {daySel.completas.map((c, i) => (
                                  <div key={i} className="text-xs text-gray-600 ml-2 mt-1">
                                    <p className="font-medium">
                                      Completa #{i + 1}
                                      {!isCompletaComplete(c) && <span className="text-yellow-600 ml-1">(incomplete)</span>}
                                    </p>
                                    {c.entree && <p className="ml-2">{c.entree.menuItem.name}</p>}
                                    {c.sides.map((s, si) => (
                                      <p key={si} className="ml-2 text-gray-500">+ {s.quantity}x {s.name}</p>
                                    ))}
                                  </div>
                                ))}
                                {daySel.extraEntrees.map((e, i) => (
                                  <p key={`ee-${i}`} className="text-xs text-blue-600 ml-2">Extra: {e.quantity}x {e.item.menuItem.name}</p>
                                ))}
                                {daySel.extraSides.map((s, i) => (
                                  <p key={`es-${i}`} className="text-xs text-orange-600 ml-2">Extra: {s.quantity}x {s.name}</p>
                                ))}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button onClick={() => { setError(""); setStep(1); }} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">
                    Back
                  </button>
                  <button
                    onClick={() => {
                      setError("");
                      if (validateStep2()) setStep(3);
                    }}
                    disabled={orderableDays.length === 0}
                    className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    Next: Delivery & Payment
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Step 3: Delivery & Payment ── */}
        {step === 3 && selectedCustomer && (
          <div className="space-y-6">
            {/* Delivery/Pickup */}
            <div className="bg-white shadow rounded-lg p-4">
              <h2 className="font-semibold text-gray-900 mb-3">Delivery Method</h2>
              <div className="flex gap-3 mb-4">
                <button
                  onClick={() => setIsPickup(false)}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${!isPickup ? "bg-green-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                >
                  Delivery
                </button>
                <button
                  onClick={() => { setIsPickup(true); setSelectedAddressId(null); }}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${isPickup ? "bg-green-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                >
                  Pickup
                </button>
              </div>

              {!isPickup && (
                <div>
                  {selectedCustomer.addresses.length === 0 ? (
                    <p className="text-sm text-gray-500">No addresses on file for this customer.</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedCustomer.addresses.map((addr) => (
                        <label key={addr.id} className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                          <input
                            type="radio"
                            name="address"
                            checked={selectedAddressId === addr.id}
                            onChange={() => setSelectedAddressId(addr.id)}
                            className="mt-1"
                          />
                          <div className="text-sm text-gray-700">
                            <p>{addr.street}{addr.unit ? `, ${addr.unit}` : ""}</p>
                            <p>{addr.city}, {addr.state} {addr.zipCode}</p>
                            {addr.deliveryNotes && <p className="text-gray-500">Note: {addr.deliveryNotes}</p>}
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Payment */}
            <div className="bg-white shadow rounded-lg p-4">
              <h2 className="font-semibold text-gray-900 mb-3">Payment</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => {
                      const method = e.target.value;
                      setPaymentMethod(method);
                      if (method === "CREDIT_ACCOUNT") {
                        setPaymentStatus("CREDIT_ACCOUNT");
                      } else {
                        setPaymentStatus("PENDING");
                      }
                    }}
                    className="w-full sm:w-60 px-3 py-2 border border-gray-300 rounded-md text-gray-900 text-sm"
                  >
                    <option value="CASH">Cash</option>
                    <option value="CHECK">Check</option>
                    <option value="CARD">Card</option>
                    <option value="CREDIT_ACCOUNT">Credit Account</option>
                  </select>
                </div>
                {paymentMethod !== "CREDIT_ACCOUNT" && (
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Payment Status</label>
                    <select
                      value={paymentStatus}
                      onChange={(e) => setPaymentStatus(e.target.value)}
                      className="w-full sm:w-60 px-3 py-2 border border-gray-300 rounded-md text-gray-900 text-sm"
                    >
                      <option value="PENDING">Pending</option>
                      <option value="PAID">Paid</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white shadow rounded-lg p-4">
              <h2 className="font-semibold text-gray-900 mb-3">Order Notes</h2>
              <textarea
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 text-sm"
                placeholder="Internal notes (e.g., phone order, special requests)..."
              />
            </div>

            {/* Pricing */}
            {pricing && (
              <div className="bg-white shadow rounded-lg p-4">
                <h2 className="font-semibold text-gray-900 mb-3">Pricing</h2>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span>${totals.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Delivery Fee</span>
                    <span>{isPickup ? "FREE" : `$${totals.deliveryFee.toFixed(2)}`}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-gray-900 pt-1 border-t">
                    <span>Total</span>
                    <span>${totals.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => { setError(""); setStep(2); }} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">
                Back
              </button>
              <button
                onClick={() => {
                  setError("");
                  if (validateStep3()) setStep(4);
                }}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Next: Review
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4: Review & Submit ── */}
        {step === 4 && selectedCustomer && (
          <div className="space-y-6">
            {/* Customer */}
            <div className="bg-white shadow rounded-lg p-4">
              <h2 className="font-semibold text-gray-900 mb-2">Customer</h2>
              <p className="text-sm text-gray-900">
                {selectedCustomer.firstName} {selectedCustomer.lastName}
              </p>
              <p className="text-sm text-gray-600">
                {selectedCustomer.email || "No email"} | {selectedCustomer.phone || "No phone"}
              </p>
            </div>

            {/* Order Items */}
            <div className="bg-white shadow rounded-lg p-4">
              <h2 className="font-semibold text-gray-900 mb-2">
                Order Items &mdash; {menus[selectedMenuIndex] && formatWeekRange(menus[selectedMenuIndex].weekStartDate)}
              </h2>
              <div className="space-y-3">
                {orderableDays.map((dayNum) => {
                  const dayName = DAYS.find((d) => d.num === dayNum)!.name;
                  const daySel = getDaySelection(dayNum);
                  return (
                    <div key={dayNum} className="border border-gray-200 rounded-lg p-3">
                      <p className="font-medium text-gray-900 mb-1">{dayName}</p>
                      {daySel.completas.map((c, i) => (
                        <div key={i} className="ml-3 mb-1">
                          <p className="text-sm font-medium text-gray-700">Completa #{i + 1}</p>
                          {c.entree && <p className="text-sm text-gray-600 ml-3">{c.entree.menuItem.name}</p>}
                          {c.sides.map((s, si) => (
                            <p key={si} className="text-sm text-gray-500 ml-3">+ {s.quantity > 1 ? `${s.quantity}x ` : ""}{s.name}</p>
                          ))}
                        </div>
                      ))}
                      {daySel.extraEntrees.map((e, i) => (
                        <p key={`ee-${i}`} className="text-sm text-blue-600 ml-3">
                          Extra: {e.quantity}x {e.item.menuItem.name}
                        </p>
                      ))}
                      {daySel.extraSides.map((s, i) => (
                        <p key={`es-${i}`} className="text-sm text-orange-600 ml-3">
                          Extra: {s.quantity}x {s.name}
                        </p>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Delivery */}
            <div className="bg-white shadow rounded-lg p-4">
              <h2 className="font-semibold text-gray-900 mb-2">
                {isPickup ? "Pickup" : "Delivery"}
              </h2>
              {isPickup ? (
                <p className="text-sm text-gray-600">Pickup at Latin Lite Cantina</p>
              ) : (
                (() => {
                  const addr = selectedCustomer.addresses.find((a) => a.id === selectedAddressId);
                  return addr ? (
                    <div className="text-sm text-gray-600">
                      <p>{addr.street}{addr.unit ? `, ${addr.unit}` : ""}</p>
                      <p>{addr.city}, {addr.state} {addr.zipCode}</p>
                    </div>
                  ) : null;
                })()
              )}
            </div>

            {/* Payment & Pricing */}
            <div className="bg-white shadow rounded-lg p-4">
              <h2 className="font-semibold text-gray-900 mb-2">Payment</h2>
              <p className="text-sm text-gray-600 mb-3">
                {paymentMethod.replace(/_/g, " ")} &mdash; {paymentStatus.replace(/_/g, " ")}
              </p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>${totals.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Delivery Fee</span>
                  <span>{isPickup ? "FREE" : `$${totals.deliveryFee.toFixed(2)}`}</span>
                </div>
                <div className="flex justify-between font-semibold text-gray-900 pt-1 border-t">
                  <span>Total</span>
                  <span>${totals.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {orderNotes && (
              <div className="bg-white shadow rounded-lg p-4">
                <h2 className="font-semibold text-gray-900 mb-2">Notes</h2>
                <p className="text-sm text-gray-600">{orderNotes}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => { setError(""); setStep(3); }} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {submitting ? "Placing Order..." : "Place Order"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
