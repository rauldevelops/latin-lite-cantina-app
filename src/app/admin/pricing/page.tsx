"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type PricingConfig = {
  id: string;
  completaPrice: number;
  extraEntreePrice: number;
  extraSidePrice: number;
  deliveryFeePerMeal: number;
};

export default function PricingSettingsPage() {
  const router = useRouter();
  const [config, setConfig] = useState<PricingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function fetchConfig() {
      try {
        const res = await fetch("/api/admin/pricing");
        if (!res.ok) {
          if (res.status === 401) {
            router.push("/login");
            return;
          }
          throw new Error("Failed to fetch");
        }
        const data = await res.json();
        setConfig({
          ...data,
          completaPrice: Number(data.completaPrice),
          extraEntreePrice: Number(data.extraEntreePrice),
          extraSidePrice: Number(data.extraSidePrice),
          deliveryFeePerMeal: Number(data.deliveryFeePerMeal),
        });
      } catch (err) {
        setError(`Failed to load pricing: ${err}`);
      } finally {
        setLoading(false);
      }
    }
    fetchConfig();
  }, [router]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/admin/pricing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          completaPrice: formData.get("completaPrice"),
          extraEntreePrice: formData.get("extraEntreePrice"),
          extraSidePrice: formData.get("extraSidePrice"),
          deliveryFeePerMeal: formData.get("deliveryFeePerMeal"),
        }),
      });

      if (!res.ok) {
        const result = await res.json();
        setError(result.error || "Failed to update pricing");
        return;
      }

      setSuccess("Pricing updated successfully");
    } catch (err) {
      setError(`Something went wrong: ${err}`);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">{error || "Failed to load pricing config"}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <Link
            href="/admin/menu-items"
            className="text-latin-red hover:text-latin-orange transition-colors"
          >
            ← Back to Menu Items
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-4">
            Pricing Settings
          </h1>
          <p className="text-gray-600 mt-1">
            Configure flat pricing for completas, extras, and delivery.
          </p>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-100 text-green-700 p-3 rounded mb-4">
            {success}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="bg-white shadow rounded-lg p-6 space-y-6"
        >
          <div>
            <label
              htmlFor="completaPrice"
              className="block text-sm font-medium text-gray-700"
            >
              Completa Price (1 entree + 3 sides)
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500">$</span>
              </div>
              <input
                id="completaPrice"
                name="completaPrice"
                type="number"
                step="0.01"
                min="0"
                required
                defaultValue={config.completaPrice.toFixed(2)}
                className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md text-gray-900"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="extraEntreePrice"
              className="block text-sm font-medium text-gray-700"
            >
              Extra Entree Price (per entree)
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500">$</span>
              </div>
              <input
                id="extraEntreePrice"
                name="extraEntreePrice"
                type="number"
                step="0.01"
                min="0"
                required
                defaultValue={config.extraEntreePrice.toFixed(2)}
                className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md text-gray-900"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="extraSidePrice"
              className="block text-sm font-medium text-gray-700"
            >
              Extra Side Price (per side)
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500">$</span>
              </div>
              <input
                id="extraSidePrice"
                name="extraSidePrice"
                type="number"
                step="0.01"
                min="0"
                required
                defaultValue={config.extraSidePrice.toFixed(2)}
                className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md text-gray-900"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="deliveryFeePerMeal"
              className="block text-sm font-medium text-gray-700"
            >
              Delivery Fee (per meal)
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500">$</span>
              </div>
              <input
                id="deliveryFeePerMeal"
                name="deliveryFeePerMeal"
                type="number"
                step="0.01"
                min="0"
                required
                defaultValue={config.deliveryFeePerMeal.toFixed(2)}
                className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md text-gray-900"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-2 px-4 bg-latin-red text-white rounded-full hover:bg-latin-orange uppercase font-semibold transition-colors disabled:opacity-50"
          >
            {saving ? "SAVING..." : "SAVE PRICING"}
          </button>
        </form>
      </div>
    </div>
  );
}
