"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  type: "ENTREE" | "SIDE";
  isActive: boolean;
  isDessert: boolean;
  isSoup: boolean;
  isStaple: boolean;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  sodium: number | null;
};

export default function EditMenuItemPage() {
  const router = useRouter();
  const params = useParams();
  const [menuItem, setMenuItem] = useState<MenuItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [itemType, setItemType] = useState("");

  useEffect(() => {
        async function fetchMenuItem() {
          const id = await params.id;
          try {
            const res = await fetch(`/api/admin/menu-items/${id}`);      

        if (!res.ok) {
          if (res.status === 401) {
            router.push("/login");
            return;
          }
          throw new Error("Failed to fetch");
        }

        const data = await res.json();
        setMenuItem(data);
        setItemType(data.type);
      } catch (err) {
        setError(`Failed to load menu item: ${err}`);
      } finally {
        setLoading(false);
      }
    }

    fetchMenuItem();
}, [params, router]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSaving(true);

    const formData = new FormData(e.currentTarget);
    const parseNutrition = (value: FormDataEntryValue | null) => {
      if (!value || value === "") return null;
      const num = parseInt(value.toString(), 10);
      return isNaN(num) ? null : num;
    };

    const data = {
      name: formData.get("name"),
      description: formData.get("description") || null,
      imageUrl: formData.get("imageUrl") || null,
      type: formData.get("type"),
      isDessert: formData.get("isDessert") === "on",
      isSoup: formData.get("isSoup") === "on",
      isStaple: formData.get("isStaple") === "on",
      calories: parseNutrition(formData.get("calories")),
      protein: parseNutrition(formData.get("protein")),
      carbs: parseNutrition(formData.get("carbs")),
      fat: parseNutrition(formData.get("fat")),
      sodium: parseNutrition(formData.get("sodium")),
    };

    try {
        const id = await params.id;
        const res = await fetch(`/api/admin/menu-items/${id}`, {        
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const result = await res.json();
        setError(result.error || "Failed to update menu item");
        return;
      }

      router.push("/admin/menu-items");
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

  if (!menuItem) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Menu item not found</p>
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
            Edit Menu Item
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
              defaultValue={menuItem.name}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
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
              defaultValue={menuItem.description || ""}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
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
              defaultValue={menuItem.imageUrl || ""}
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
                  defaultChecked={menuItem.isDessert}
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
                  defaultChecked={menuItem.isSoup}
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

          <div className="flex items-center gap-2">
            <input
              id="isStaple"
              name="isStaple"
              type="checkbox"
              defaultChecked={menuItem.isStaple}
              className="h-4 w-4 rounded border-gray-300 text-green-600"
            />
            <label
              htmlFor="isStaple"
              className="text-sm font-medium text-gray-700"
            >
              Staple item? (always available, shown every day)
            </label>
          </div>

          {/* Nutrition Information */}
          <div className="border-t border-gray-200 pt-4 mt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Nutrition Info (per serving)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="calories"
                  className="block text-sm font-medium text-gray-700"
                >
                  Calories
                </label>
                <input
                  id="calories"
                  name="calories"
                  type="number"
                  min="0"
                  defaultValue={menuItem.calories ?? ""}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                  placeholder="kcal"
                />
              </div>
              <div>
                <label
                  htmlFor="protein"
                  className="block text-sm font-medium text-gray-700"
                >
                  Protein (g)
                </label>
                <input
                  id="protein"
                  name="protein"
                  type="number"
                  min="0"
                  defaultValue={menuItem.protein ?? ""}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                  placeholder="grams"
                />
              </div>
              <div>
                <label
                  htmlFor="carbs"
                  className="block text-sm font-medium text-gray-700"
                >
                  Carbs (g)
                </label>
                <input
                  id="carbs"
                  name="carbs"
                  type="number"
                  min="0"
                  defaultValue={menuItem.carbs ?? ""}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                  placeholder="grams"
                />
              </div>
              <div>
                <label
                  htmlFor="fat"
                  className="block text-sm font-medium text-gray-700"
                >
                  Fat (g)
                </label>
                <input
                  id="fat"
                  name="fat"
                  type="number"
                  min="0"
                  defaultValue={menuItem.fat ?? ""}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                  placeholder="grams"
                />
              </div>
              <div>
                <label
                  htmlFor="sodium"
                  className="block text-sm font-medium text-gray-700"
                >
                  Sodium (mg)
                </label>
                <input
                  id="sodium"
                  name="sodium"
                  type="number"
                  min="0"
                  defaultValue={menuItem.sodium ?? ""}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                  placeholder="mg"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2 px-6 bg-latin-red text-white rounded-full hover:bg-latin-orange uppercase font-semibold disabled:opacity-50 transition-colors"
            >
              {saving ? "SAVING..." : "SAVE CHANGES"}
            </button>
            <Link
              href="/admin/menu-items"
              className="flex-1 py-2 px-6 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 text-center uppercase font-semibold transition-colors"
            >
              CANCEL
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}