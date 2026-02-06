"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type WeeklyMenu = {
  id: string;
  weekStartDate: string;
  isPublished: boolean;
  publishedAt: string | null;
  menuItems: { id: string }[];
};

export default function WeeklyMenusPage() {
  const router = useRouter();
  const [weeklyMenus, setWeeklyMenus] = useState<WeeklyMenu[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [cloneFromId, setCloneFromId] = useState("");


  useEffect(() => {
    async function fetchWeeklyMenus() {
      try {
        const res = await fetch("/api/admin/weekly-menus");

        if (!res.ok) {
          if (res.status === 401) {
            router.push("/login");
            return;
          }
          throw new Error("Failed to fetch");
        }

        const data = await res.json();
        setWeeklyMenus(data);
      } catch (err) {
        setError(`Failed to load weekly menus ${err}`);
      } finally {
        setLoading(false);
      }
    }

    fetchWeeklyMenus();
  }, [router]);

  function getNextMonday(): string {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + daysUntilMonday);
    return nextMonday.toISOString().split("T")[0];
  }

  function adjustToMonday(dateString: string): string {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();
    
    // Adjust to Monday (if Sunday, go forward 1 day; otherwise go back to Monday)
    const diff = dayOfWeek === 0 ? 1 : 1 - dayOfWeek;
    date.setDate(date.getDate() + diff);
    
    return date.toISOString().split('T')[0];
  }  

  async function createWeeklyMenu(weekStartDate: string) {
    setCreating(true);
    setError("");

    try {
      const res = await fetch("/api/admin/weekly-menus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekStartDate, cloneFromId: cloneFromId || undefined }),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error || "Failed to create weekly menu");
        return;
      }

      router.push(`/admin/weekly-menus/${result.id}`);
    } catch (err) {
      setError(`Something went wrong ${err}`);
    } finally {
      setCreating(false);
    }
  }

  async function deleteWeeklyMenu(id: string, date: string) {
    if (!confirm(`Delete menu for week of ${formatDate(date)}?`)) return;

    try {
      const res = await fetch(`/api/admin/weekly-menus/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete");
      }

      setWeeklyMenus(weeklyMenus.filter((menu) => menu.id !== id));
    } catch (err) {
      alert(`Failed to delete weekly menu ${err}`);
    }
  }

  async function togglePublish(id: string, currentStatus: boolean) {
    try {
      const res = await fetch(`/api/admin/weekly-menus/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !currentStatus }),
      });

      if (!res.ok) throw new Error("Failed to update");

      const updated = await res.json();
      setWeeklyMenus(
        weeklyMenus.map((menu) =>
          menu.id === id
            ? { ...menu, isPublished: updated.isPublished, publishedAt: updated.publishedAt }
            : menu
        )
      );
    } catch (err) {
      alert(`Failed to update weekly menu ${err}`);
    }
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
      <div className="flex flex-col gap-4 mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Weekly Menus</h1>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 sm:items-center">
            <input
              type="date"
              id="weekStart"
              defaultValue={getNextMonday()}
              onChange={(e) => {
                e.target.value = adjustToMonday(e.target.value);
              }}
              className="px-3 py-2 border border-gray-300 rounded-md text-gray-900 w-full sm:w-auto"
            />

            <select
              id="cloneFrom"
              value={cloneFromId}
              onChange={(e) => setCloneFromId(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-gray-900 w-full sm:w-auto"
            >
              <option value="">Start from scratch</option>
              {weeklyMenus.map((menu) => (
                <option key={menu.id} value={menu.id}>
                  Clone from {formatDate(menu.weekStartDate)} ({menu.menuItems.length} items)
                </option>
              ))}
            </select>

            <button
              onClick={() => {
                const input = document.getElementById("weekStart") as HTMLInputElement;
                createWeeklyMenu(input.value);
              }}
              disabled={creating}
              className="px-4 py-2 bg-latin-orange text-white rounded-full hover:bg-latin-red uppercase font-semibold transition-colors disabled:opacity-50 w-full sm:w-auto"
            >
              {creating ? "CREATING..." : "CREATE WEEK"}
            </button>
          </div>
        </div>


        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>
        )}

        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Week Starting
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Items
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {weeklyMenus.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                    No weekly menus yet. Create your first one!
                  </td>
                </tr>
              ) : (
                weeklyMenus.map((menu) => (
                  <tr key={menu.id}>
                    <td className="px-6 py-4 text-gray-900 font-medium">
                      {formatDate(menu.weekStartDate)}
                    </td>
                    <td className="px-6 py-4 text-gray-900">
                      {menu.menuItems.length} items
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => togglePublish(menu.id, menu.isPublished)}
                        className={`px-2 py-1 text-xs rounded-full ${
                          menu.isPublished
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {menu.isPublished ? "Published" : "Draft"}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <Link
                        href={`/admin/weekly-menus/${menu.id}`}
                        className="text-latin-orange hover:text-latin-red transition-colors"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => deleteWeeklyMenu(menu.id, menu.weekStartDate)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-8">
          <Link
            href="/admin/menu-items"
            className="text-latin-orange hover:text-latin-red transition-colors"
          >
            ← Back to Menu Items
          </Link>
        </div>
      </div>
    </div>
  );
}