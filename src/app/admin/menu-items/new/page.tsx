"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewMenuItemPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [itemType, setItemType] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name"),
      description: formData.get("description") || null,
      imageUrl: formData.get("imageUrl") || null,
      type: formData.get("type"),
      isDessert: formData.get("isDessert") === "on",
      isSoup: formData.get("isSoup") === "on",
      isStaple: formData.get("isStaple") === "on",
    };

    try {
      const res = await fetch("/api/admin/menu-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const result = await res.json();
        setError(result.error || "Failed to create menu item");
        return;
      }

      router.push("/admin/menu-items");
    } catch (err) {
      setError(`Something went wrong: ${err}`);
    } finally {
      setLoading(false);
    }
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
            Add New Menu Item
          </h1>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="bg-white shadow rounded-lg p-6 space-y-4"
        >
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700"
            >
              Name *
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
              placeholder="e.g., Ropa Vieja"
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700"
            >
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
              placeholder="Brief description of the item"
            />
          </div>

          <div>
            <label
              htmlFor="imageUrl"
              className="block text-sm font-medium text-gray-700"
            >
              Image URL
            </label>
            <input
              id="imageUrl"
              name="imageUrl"
              type="url"
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
              placeholder="https://example.com/image.jpg"
            />
            <p className="mt-1 text-xs text-gray-500">
              Enter a URL for the menu item image
            </p>
          </div>

          <div>
            <label
              htmlFor="type"
              className="block text-sm font-medium text-gray-700"
            >
              Type *
            </label>
            <select
              id="type"
              name="type"
              required
              value={itemType}
              onChange={(e) => setItemType(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
            >
              <option value="">Select type...</option>
              <option value="ENTREE">Entree</option>
              <option value="SIDE">Side</option>
            </select>
          </div>

          {itemType === "SIDE" && (
            <>
              <div className="flex items-center gap-2">
                <input
                  id="isDessert"
                  name="isDessert"
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-purple-600"
                />
                <label
                  htmlFor="isDessert"
                  className="text-sm font-medium text-gray-700"
                >
                  Dessert? (limits to 1 per completa)
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="isSoup"
                  name="isSoup"
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-amber-600"
                />
                <label
                  htmlFor="isSoup"
                  className="text-sm font-medium text-gray-700"
                >
                  Soup? (limits to 1 per completa)
                </label>
              </div>
            </>
          )}

          {itemType && (
            <div className="flex items-center gap-2">
              <input
                id="isStaple"
                name="isStaple"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-green-600"
              />
              <label
                htmlFor="isStaple"
                className="text-sm font-medium text-gray-700"
              >
                Staple item? (always available, shown every day)
              </label>
            </div>
          )}

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 px-4 bg-latin-red text-white rounded-full hover:bg-latin-orange uppercase font-semibold transition-colors disabled:opacity-50"
            >
              {loading ? "CREATING..." : "CREATE MENU ITEM"}
            </button>
            <Link
              href="/admin/menu-items"
              className="flex-1 py-2 px-4 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 uppercase font-semibold transition-colors text-center"
            >
              CANCEL
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}