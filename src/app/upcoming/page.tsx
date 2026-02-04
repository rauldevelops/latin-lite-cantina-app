"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Completa = {
  entree: string;
  sides: string[];
};

type Meal = {
  orderId: string;
  orderNumber: string;
  orderStatus: string;
  isPickup: boolean;
  completas: Completa[];
  extraEntrees: { name: string; quantity: number }[];
  extraSides: { name: string; quantity: number }[];
};

type MealDay = {
  date: string;
  dayName: string;
  dayOfWeek: number;
  isPast: boolean;
  meals: Meal[];
};

type UpcomingData = {
  days: MealDay[];
  totalUpcomingMeals: number;
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  PREPARING: "bg-purple-100 text-purple-800",
  OUT_FOR_DELIVERY: "bg-indigo-100 text-indigo-800",
  DELIVERED: "bg-green-100 text-green-800",
};

function formatDate(dateString: string): string {
  const date = new Date(dateString + "T12:00:00");
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function isToday(dateString: string): boolean {
  const today = new Date();
  const date = new Date(dateString + "T12:00:00");
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

export default function UpcomingMealsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<UpcomingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    async function fetchUpcoming() {
      try {
        const response = await fetch("/api/upcoming-meals");
        if (!response.ok) {
          throw new Error("Failed to fetch");
        }
        const result = await response.json();
        setData(result);
      } catch {
        setError("Failed to load upcoming meals");
      } finally {
        setLoading(false);
      }
    }

    if (session) {
      fetchUpcoming();
    }
  }, [session]);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-8"></div>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-40 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Upcoming Meals</h1>
            {data && data.totalUpcomingMeals > 0 && (
              <p className="text-sm text-gray-500 mt-1">
                {data.totalUpcomingMeals} meal{data.totalUpcomingMeals !== 1 ? "s" : ""} scheduled
              </p>
            )}
          </div>
          <Link
            href="/order"
            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700"
          >
            Place New Order
          </Link>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {data && data.days.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="text-gray-400 text-5xl mb-4">📅</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              No upcoming meals
            </h2>
            <p className="text-gray-600 mb-6">
              You don&apos;t have any meals scheduled. Place an order to see your upcoming meals here!
            </p>
            <Link
              href="/order"
              className="inline-block px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700"
            >
              Browse Menu & Order
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {data?.days.map((day) => (
              <div
                key={day.date}
                className={`bg-white rounded-lg shadow overflow-hidden ${
                  isToday(day.date) ? "ring-2 ring-green-500" : ""
                }`}
              >
                {/* Day Header */}
                <div
                  className={`px-6 py-4 border-b ${
                    isToday(day.date)
                      ? "bg-green-50 border-green-200"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-lg font-semibold ${
                          isToday(day.date) ? "text-green-700" : "text-gray-900"
                        }`}
                      >
                        {day.dayName}
                      </span>
                      <span className="text-sm text-gray-500">
                        {formatDate(day.date)}
                      </span>
                      {isToday(day.date) && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-green-600 text-white rounded-full">
                          Today
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-gray-500">
                      {day.meals.reduce((sum, m) => sum + m.completas.length, 0)} meal
                      {day.meals.reduce((sum, m) => sum + m.completas.length, 0) !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>

                {/* Meals for this day */}
                <div className="divide-y divide-gray-100">
                  {day.meals.map((meal, mealIdx) => (
                    <div key={`${meal.orderId}-${mealIdx}`} className="p-6">
                      {/* Order info */}
                      <div className="flex items-center gap-3 mb-4">
                        <Link
                          href={`/orders/${meal.orderId}`}
                          className="text-sm font-medium text-green-600 hover:text-green-700"
                        >
                          {meal.orderNumber}
                        </Link>
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                            STATUS_COLORS[meal.orderStatus] || "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {meal.orderStatus.replace(/_/g, " ")}
                        </span>
                        <span className="text-xs text-gray-500">
                          {meal.isPickup ? "Pickup" : "Delivery"}
                        </span>
                      </div>

                      {/* Completas */}
                      <div className="space-y-3">
                        {meal.completas.map((completa, idx) => (
                          <div
                            key={idx}
                            className="bg-gray-50 rounded-lg p-4"
                          >
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                                {idx + 1}
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">
                                  {completa.entree}
                                </p>
                                {completa.sides.length > 0 && (
                                  <p className="text-sm text-gray-600 mt-1">
                                    with {completa.sides.join(", ")}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Extras */}
                      {(meal.extraEntrees.length > 0 || meal.extraSides.length > 0) && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <p className="text-sm font-medium text-gray-700 mb-2">
                            Extras:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {meal.extraEntrees.map((extra, idx) => (
                              <span
                                key={`entree-${idx}`}
                                className="px-2 py-1 bg-orange-50 text-orange-700 text-sm rounded"
                              >
                                {extra.quantity > 1 && `${extra.quantity}x `}
                                {extra.name}
                              </span>
                            ))}
                            {meal.extraSides.map((extra, idx) => (
                              <span
                                key={`side-${idx}`}
                                className="px-2 py-1 bg-blue-50 text-blue-700 text-sm rounded"
                              >
                                {extra.quantity > 1 && `${extra.quantity}x `}
                                {extra.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick links */}
        {data && data.days.length > 0 && (
          <div className="mt-8 text-center">
            <Link
              href="/orders"
              className="text-sm text-gray-600 hover:text-green-600"
            >
              View all orders &rarr;
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
