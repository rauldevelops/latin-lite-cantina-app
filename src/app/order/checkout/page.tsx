"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import StripeProvider from "@/components/StripeProvider";
import PaymentForm from "@/components/PaymentForm";

type Address = {
  id: string;
  street: string;
  unit: string | null;
  city: string;
  state: string;
  zipCode: string;
  deliveryNotes: string | null;
  isDefault: boolean;
};

type PricingConfig = {
  completaPrice: number;
  extraEntreePrice: number;
  extraSidePrice: number;
  deliveryFeePerMeal: number;
};

type OrderDayPayload = {
  dayOfWeek: number;
  completas: { entreeId: string; sides: { menuItemId: string; quantity: number }[] }[];
  extraEntrees: { menuItemId: string; quantity: number }[];
  extraSides: { menuItemId: string; quantity: number }[];
};

type OrderData = {
  weeklyMenuId: string;
  orderDays: OrderDayPayload[];
  summary: DaySummary[];
};

type DaySummary = {
  dayOfWeek: number;
  dayName: string;
  completas: { entreeName: string; sideNames: string[] }[];
  extraEntrees: { name: string; quantity: number }[];
  extraSides: { name: string; quantity: number }[];
};

const PICKUP_LOCATION = "Latin Lite Cantina";

export default function CheckoutPage() {
  const router = useRouter();
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [pricing, setPricing] = useState<PricingConfig | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isPickup, setIsPickup] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [error, setError] = useState("");
  const [addressLoading, setAddressLoading] = useState(true);

  // Order and payment state
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderCreating, setOrderCreating] = useState(false);
  const [orderUpdating, setOrderUpdating] = useState(false);
  const orderCreatedRef = useRef(false);

  // New address form state
  const [newAddress, setNewAddress] = useState({
    street: "",
    unit: "",
    city: "",
    state: "",
    zipCode: "",
    deliveryNotes: "",
    isDefault: false,
  });
  const [savingAddress, setSavingAddress] = useState(false);

  // Promo code state
  const [promoCode, setPromoCode] = useState("");
  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoDescription, setPromoDescription] = useState("");
  const [promoApplying, setPromoApplying] = useState(false);
  const [promoError, setPromoError] = useState("");

  // Load initial data
  useEffect(() => {
    const stored = sessionStorage.getItem("checkoutOrderData");
    if (!stored) {
      router.push("/order");
      return;
    }
    setOrderData(JSON.parse(stored));

    Promise.all([
      fetch("/api/pricing").then((r) => r.json()),
      fetch("/api/addresses").then((r) => r.json()),
    ])
      .then(([pricingData, addressData]) => {
        setPricing(pricingData);
        setAddresses(addressData);
        const defaultAddr = addressData.find((a: Address) => a.isDefault);
        if (defaultAddr) setSelectedAddressId(defaultAddr.id);
      })
      .catch((err) => setError(`Failed to load checkout data: ${err}`))
      .finally(() => setAddressLoading(false));
  }, [router]);

  // Create order once data is loaded
  const createOrder = useCallback(async () => {
    // CRITICAL: Prevent duplicate orders with multiple checks
    // 1. Check the ref first (synchronous lock)
    if (orderCreatedRef.current) return;

    // 2. Set the lock immediately before any async work
    orderCreatedRef.current = true;

    // Now do validation checks - if we return early, we keep the lock
    // to prevent any other attempts (the order will be created on success)
    if (!orderData) {
      orderCreatedRef.current = false; // Only reset if no order data
      return;
    }

    // For delivery, need an address selected
    if (!isPickup && !selectedAddressId && addresses.length > 0) {
      orderCreatedRef.current = false; // Reset to allow retry when address is selected
      return;
    }

    // For delivery with no addresses, user needs to add one first
    if (!isPickup && addresses.length === 0) {
      orderCreatedRef.current = false; // Reset to allow retry when address is added
      return;
    }

    setOrderCreating(true);
    setError("");

    try {
      // Create the order
      const orderRes = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weeklyMenuId: orderData.weeklyMenuId,
          orderDays: orderData.orderDays,
          isPickup,
          addressId: isPickup ? null : selectedAddressId,
        }),
      });

      if (!orderRes.ok) {
        const data = await orderRes.json();
        throw new Error(data.error || "Failed to create order");
      }

      const order = await orderRes.json();
      setOrderId(order.id);

      // Create PaymentIntent
      const paymentRes = await fetch("/api/stripe/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id }),
      });

      if (!paymentRes.ok) {
        const data = await paymentRes.json();
        throw new Error(data.error || "Failed to initialize payment");
      }

      const { clientSecret: secret } = await paymentRes.json();
      setClientSecret(secret);
      // Keep orderCreatedRef.current = true on success
    } catch (err) {
      // Only reset on error to allow retry
      orderCreatedRef.current = false;
      setError(`${err}`);
    } finally {
      setOrderCreating(false);
    }
  }, [orderData, isPickup, selectedAddressId, addresses.length]);

  // Auto-create order when ready (runs once when conditions are met)
  useEffect(() => {
    // Skip if already created or currently creating
    if (orderCreatedRef.current || orderCreating) return;

    // Skip if data not loaded
    if (addressLoading || !orderData || !pricing) return;

    // For pickup, create immediately
    // For delivery, wait for address
    if (isPickup || selectedAddressId) {
      createOrder();
    }
    // Note: We intentionally exclude createOrder from deps to prevent re-runs
    // The ref tracks whether order was created
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addressLoading, orderData, pricing, isPickup, selectedAddressId, orderCreating]);

  // Update order when delivery options change (after order is created)
  useEffect(() => {
    if (!orderId || orderUpdating) return;

    async function updateOrder() {
      setOrderUpdating(true);
      setError("");

      try {
        const res = await fetch(`/api/orders/${orderId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            isPickup,
            addressId: isPickup ? null : selectedAddressId,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to update order");
        }
      } catch (err) {
        setError(`${err}`);
      } finally {
        setOrderUpdating(false);
      }
    }

    updateOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPickup, selectedAddressId]);

  function calculateTotals() {
    if (!orderData || !pricing) return { subtotal: 0, deliveryFee: 0, discount: 0, total: 0, totalMeals: 0 };

    let subtotal = 0;
    let totalMeals = 0;

    for (const day of orderData.orderDays) {
      subtotal += day.completas.length * pricing.completaPrice;
      totalMeals += day.completas.length;
      for (const extra of day.extraEntrees) {
        subtotal += extra.quantity * pricing.extraEntreePrice;
        totalMeals += extra.quantity;
      }
      for (const extra of day.extraSides) {
        subtotal += extra.quantity * pricing.extraSidePrice;
      }
    }

    const deliveryFee = isPickup ? 0 : totalMeals * pricing.deliveryFeePerMeal;
    const discount = promoDiscount;
    return { subtotal, deliveryFee, discount, total: subtotal - discount + deliveryFee, totalMeals };
  }

  async function handleSaveAddress(e: React.FormEvent) {
    e.preventDefault();
    setSavingAddress(true);

    try {
      const res = await fetch("/api/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAddress),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save address");
      }

      const saved = await res.json();
      setAddresses((prev) => {
        if (saved.isDefault) {
          return [...prev.map((a) => ({ ...a, isDefault: false })), saved];
        }
        return [...prev, saved];
      });
      setSelectedAddressId(saved.id);
      setShowAddressForm(false);
      setNewAddress({ street: "", unit: "", city: "", state: "", zipCode: "", deliveryNotes: "", isDefault: false });
    } catch (err) {
      setError(`Failed to save address: ${err}`);
    } finally {
      setSavingAddress(false);
    }
  }

  function handlePaymentSuccess() {
    sessionStorage.removeItem("checkoutOrderData");
    router.push(`/order/confirmation?id=${orderId}`);
  }

  function handlePaymentError(message: string) {
    setError(message);
  }

  async function handleApplyPromo(e: React.FormEvent) {
    e.preventDefault();
    if (!orderId || !promoCodeInput.trim()) return;

    setPromoApplying(true);
    setPromoError("");

    try {
      const res = await fetch(`/api/orders/${orderId}/apply-promo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: promoCodeInput.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setPromoError(data.error || "Failed to apply promo code");
        return;
      }

      setPromoCode(data.promoCode);
      setPromoDiscount(data.discountAmount);
      setPromoDescription(data.discountDescription);
      setPromoCodeInput("");
    } catch (err) {
      setPromoError(`Failed to apply promo code: ${err}`);
    } finally {
      setPromoApplying(false);
    }
  }

  async function handleRemovePromo() {
    if (!orderId) return;

    setPromoApplying(true);
    setPromoError("");

    try {
      const res = await fetch(`/api/orders/${orderId}/apply-promo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: null }),
      });

      if (!res.ok) {
        const data = await res.json();
        setPromoError(data.error || "Failed to remove promo code");
        return;
      }

      setPromoCode("");
      setPromoDiscount(0);
      setPromoDescription("");
    } catch (err) {
      setPromoError(`Failed to remove promo code: ${err}`);
    } finally {
      setPromoApplying(false);
    }
  }

  if (!orderData || !pricing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">{addressLoading ? "Loading..." : "Redirecting..."}</p>
      </div>
    );
  }

  const { subtotal, deliveryFee, discount, total } = calculateTotals();
  const canShowPayment = clientSecret && orderId;
  const needsAddress = !isPickup && !selectedAddressId && addresses.length === 0;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/order" className="text-latin-red hover:text-latin-orange transition-colors text-sm">
            &larr; Back to Order Builder
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-2">Checkout</h1>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Delivery/Payment */}
          <div className="lg:col-span-2 space-y-6">
            {/* Delivery vs Pickup */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Delivery Method
              </h2>
              <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1 mb-4">
                <button
                  onClick={() => setIsPickup(false)}
                  disabled={orderUpdating}
                  className={`px-4 py-2 rounded-full text-sm font-semibold uppercase transition-colors ${
                    !isPickup
                      ? "bg-latin-red text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  } ${orderUpdating ? "opacity-50" : ""}`}
                >
                  DELIVERY
                </button>
                <button
                  onClick={() => setIsPickup(true)}
                  disabled={orderUpdating}
                  className={`px-4 py-2 rounded-full text-sm font-semibold uppercase transition-colors ${
                    isPickup
                      ? "bg-latin-red text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  } ${orderUpdating ? "opacity-50" : ""}`}
                >
                  PICKUP
                </button>
              </div>

              {isPickup ? (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-700 font-medium">Pickup Location</p>
                  <p className="text-gray-600 text-sm mt-1">{PICKUP_LOCATION}</p>
                  <p className="text-latin-red text-sm mt-2 font-medium">Free pickup!</p>
                </div>
              ) : (
                <div>
                  {addressLoading ? (
                    <p className="text-gray-500 text-sm">Loading addresses...</p>
                  ) : (
                    <>
                      {/* Saved Addresses */}
                      {addresses.length > 0 && (
                        <div className="space-y-2 mb-4">
                          {addresses.map((addr) => (
                            <label
                              key={addr.id}
                              className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer ${
                                selectedAddressId === addr.id
                                  ? "border-latin-red bg-orange-50"
                                  : "border-gray-200 hover:border-gray-300"
                              }`}
                            >
                              <input
                                type="radio"
                                name="address"
                                checked={selectedAddressId === addr.id}
                                onChange={() => setSelectedAddressId(addr.id)}
                                disabled={orderUpdating}
                                className="mt-1"
                              />
                              <div>
                                <p className="text-gray-900 text-sm">
                                  {addr.street}
                                  {addr.unit && `, ${addr.unit}`}
                                </p>
                                <p className="text-gray-600 text-sm">
                                  {addr.city}, {addr.state} {addr.zipCode}
                                </p>
                                {addr.deliveryNotes && (
                                  <p className="text-gray-500 text-xs mt-1">
                                    Note: {addr.deliveryNotes}
                                  </p>
                                )}
                                {addr.isDefault && (
                                  <span className="text-xs text-latin-red font-medium">Default</span>
                                )}
                              </div>
                            </label>
                          ))}
                        </div>
                      )}

                      {/* Add New Address */}
                      {!showAddressForm ? (
                        <button
                          onClick={() => setShowAddressForm(true)}
                          className="text-latin-red hover:text-latin-orange transition-colors text-sm font-medium"
                        >
                          + Add New Address
                        </button>
                      ) : (
                        <form onSubmit={handleSaveAddress} className="border border-gray-200 rounded-lg p-4 space-y-3">
                          <p className="font-medium text-gray-900 text-sm">New Address</p>
                          <input
                            type="text"
                            placeholder="Street Address *"
                            required
                            value={newAddress.street}
                            onChange={(e) => setNewAddress({ ...newAddress, street: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 text-sm"
                          />
                          <input
                            type="text"
                            placeholder="Apt / Unit (optional)"
                            value={newAddress.unit}
                            onChange={(e) => setNewAddress({ ...newAddress, unit: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 text-sm"
                          />
                          <div className="grid grid-cols-3 gap-2">
                            <input
                              type="text"
                              placeholder="City *"
                              required
                              value={newAddress.city}
                              onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                              className="px-3 py-2 border border-gray-300 rounded-md text-gray-900 text-sm"
                            />
                            <input
                              type="text"
                              placeholder="State (e.g., FL) *"
                              required
                              value={newAddress.state}
                              onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value.toUpperCase().slice(0, 2) })}
                              maxLength={2}
                              pattern="[A-Z]{2}"
                              title="Please enter a 2-letter state code (e.g., FL)"
                              className="px-3 py-2 border border-gray-300 rounded-md text-gray-900 text-sm uppercase"
                            />
                            <input
                              type="text"
                              placeholder="ZIP *"
                              required
                              value={newAddress.zipCode}
                              onChange={(e) => setNewAddress({ ...newAddress, zipCode: e.target.value })}
                              className="px-3 py-2 border border-gray-300 rounded-md text-gray-900 text-sm"
                            />
                          </div>
                          <input
                            type="text"
                            placeholder="Delivery Notes (optional)"
                            value={newAddress.deliveryNotes}
                            onChange={(e) => setNewAddress({ ...newAddress, deliveryNotes: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 text-sm"
                          />
                          <label className="flex items-center gap-2 text-sm text-gray-700">
                            <input
                              type="checkbox"
                              checked={newAddress.isDefault}
                              onChange={(e) => setNewAddress({ ...newAddress, isDefault: e.target.checked })}
                            />
                            Set as default address
                          </label>
                          <div className="flex gap-2">
                            <button
                              type="submit"
                              disabled={savingAddress}
                              className="px-6 py-3 bg-latin-red text-white text-sm rounded-full hover:bg-latin-orange uppercase font-semibold transition-colors disabled:opacity-50"
                            >
                              {savingAddress ? "SAVING..." : "SAVE ADDRESS"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowAddressForm(false)}
                              className="px-6 py-3 bg-gray-200 text-gray-700 text-sm rounded-full hover:bg-gray-300 uppercase font-semibold transition-colors"
                            >
                              CANCEL
                            </button>
                          </div>
                        </form>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Payment */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment</h2>
              {orderCreating ? (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-gray-600 text-sm">Initializing payment...</p>
                </div>
              ) : canShowPayment ? (
                <StripeProvider clientSecret={clientSecret}>
                  <PaymentForm
                    orderId={orderId}
                    onSuccess={handlePaymentSuccess}
                    onError={handlePaymentError}
                  />
                </StripeProvider>
              ) : needsAddress ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-800 text-sm font-medium">Add a delivery address</p>
                  <p className="text-yellow-700 text-sm mt-1">
                    Please add a delivery address above, or switch to pickup.
                  </p>
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-gray-600 text-sm">Loading payment form...</p>
                </div>
              )}
              {orderUpdating && (
                <p className="text-sm text-gray-500 mt-2">Updating order...</p>
              )}
            </div>
          </div>

          {/* Right: Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-4 sticky top-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Order Summary
              </h3>

              <div className="space-y-3 mb-4">
                {orderData.summary.map((day) => (
                  <div key={day.dayOfWeek} className="border-b border-gray-100 pb-3">
                    <p className="font-medium text-gray-900 text-sm">{day.dayName}</p>
                    {day.completas.map((c, i) => (
                      <div key={i} className="text-xs text-gray-600 ml-2 mt-1">
                        <p className="font-medium">Completa #{i + 1}</p>
                        <p className="ml-2">{c.entreeName}</p>
                        {c.sideNames.map((s, si) => (
                          <p key={si} className="ml-2 text-gray-500">+ {s}</p>
                        ))}
                      </div>
                    ))}
                    {day.extraEntrees.map((e, i) => (
                      <p key={`ee-${i}`} className="text-xs text-latin-red ml-2">
                        Extra: {e.quantity}x {e.name}
                      </p>
                    ))}
                    {day.extraSides.map((s, i) => (
                      <p key={`es-${i}`} className="text-xs text-latin-orange ml-2">
                        Extra: {s.quantity}x {s.name}
                      </p>
                    ))}
                  </div>
                ))}
              </div>

              {/* Promo Code */}
              <div className="border-t pt-3">
                <p className="text-sm font-medium text-gray-700 mb-2">Promo Code</p>
                {promoCode ? (
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-2">
                    <div>
                      <span className="text-green-700 font-medium text-sm">{promoCode}</span>
                      <span className="text-green-600 text-xs ml-2">({promoDescription})</span>
                    </div>
                    <button
                      onClick={handleRemovePromo}
                      disabled={promoApplying}
                      className="text-red-500 hover:text-red-700 text-xs font-medium disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleApplyPromo} className="flex gap-2">
                    <input
                      type="text"
                      value={promoCodeInput}
                      onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                      placeholder="Enter code"
                      disabled={!orderId || promoApplying}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-gray-900 text-sm uppercase"
                    />
                    <button
                      type="submit"
                      disabled={!orderId || promoApplying || !promoCodeInput.trim()}
                      className="px-3 py-2 bg-latin-red text-white text-sm rounded-md hover:bg-latin-orange disabled:opacity-50 transition-colors"
                    >
                      {promoApplying ? "..." : "Apply"}
                    </button>
                  </form>
                )}
                {promoError && (
                  <p className="text-red-500 text-xs mt-1">{promoError}</p>
                )}
              </div>

              {/* Pricing Breakdown */}
              <div className="border-t pt-3 mt-3 space-y-1">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount</span>
                    <span>-${discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-semibold text-gray-900 pt-2 border-t">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
