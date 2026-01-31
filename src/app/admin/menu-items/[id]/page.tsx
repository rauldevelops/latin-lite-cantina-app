"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  type: "ENTREE" | "SIDE";
  isActive: boolean;
  isDessert: boolean;
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
    const data = {
      name: formData.get("name"),
      description: formData.get("description") || null,
      type: formData.get("type"),
      isDessert: formData.get("isDessert") === "on",
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
            className="text-blue-600 hover:text-blue-800"
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
            <div className="flex items-center gap-2">
              <input
                id="isDessert"
                name="isDessert"
                type="checkbox"
                defaultChecked={menuItem.isDessert}
                className="h-4 w-4 rounded border-gray-300 text-blue-600"
              />
              <label
                htmlFor="isDessert"
                className="text-sm font-medium text-gray-700"
              >
                Dessert? (limits to 1 per completa)
              </label>
            </div>
          )}

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <Link
              href="/admin/menu-items"
              className="flex-1 py-2 px-4 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-center"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}