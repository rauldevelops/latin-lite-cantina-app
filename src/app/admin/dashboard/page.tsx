"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import StatCard from "@/components/admin/dashboard/StatCard";

type Period = "week" | "month" | "ytd";

type DashboardData = {
  generatedAt: string;
  period: {
    type: Period;
    start: string;
    end: string;
  };
  financial: {
    revenue: number;
    revenueByMethod: {
      card: number;
      cash: number;
      check: number;
      credit: number;
    };
    avgOrderValue: number;
    previousPeriodRevenue: number;
    revenueChangePercent: number;
  };
  orders: {
    totalOrders: number;
    byStatus: {
      pending: number;
      confirmed: number;
      preparing: number;
      outForDelivery: number;
      delivered: number;
      cancelled: number;
    };
    cancelledCount: number;
    cancelledValue: number;
    totalCompletas: number;
    avgCompletasPerOrder: number;
  };
  fulfillment: {
    byDay: Record<number, number>;
    pickupCount: number;
    deliveryCount: number;
    pickupRatio: number;
    byDriver: Array<{
      driverId: string;
      driverName: string;
      orderCount: number;
    }>;
  };
  customers: {
    totalActive: number;
    newThisWeek: number;
    newThisMonth: number;
    repeatOrderRate: number;
  };
  menu: {
    topEntrees: Array<{ id: string; name: string; count: number }>;
    topSides: Array<{ id: string; name: string; count: number }>;
    leastPopular: Array<{ id: string; name: string; count: number }>;
    dessertSelectionRate: number;
    soupSelectionRate: number;
  };
  operational: {
    upcomingWeekOrderCount: number;
    completasByDay: Record<number, number>;
    peakOrderDays: Array<{ date: string; count: number }>;
  };
};

const DAYS = ["", "Mon", "Tue", "Wed", "Thu", "Fri"];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export default function DashboardPage() {
  const router = useRouter();
  const [period, setPeriod] = useState<Period>("week");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDashboard();
  }, [period]);

  async function fetchDashboard() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/dashboard?period=${period}`);
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok) throw new Error("Failed to load dashboard");
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading dashboard");
    } finally {
      setLoading(false);
    }
  }

  const periodLabels = {
    week: "This Week",
    month: "This Month",
    ytd: "Year to Date",
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 font-['Poppins']">
              Dashboard
            </h1>
            {data && (
              <p className="text-sm text-gray-500 mt-1">
                Last updated: {new Date(data.generatedAt).toLocaleTimeString()}
              </p>
            )}
          </div>

          {/* Period Selector */}
          <div className="flex gap-1 bg-white rounded-lg shadow p-1">
            {(["week", "month", "ytd"] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  period === p
                    ? "bg-latin-red text-white"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                {periodLabels[p]}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-6">
            {error}
            <button
              onClick={fetchDashboard}
              className="ml-4 underline hover:no-underline"
            >
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className="space-y-6">
            {/* Loading skeletons */}
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-white shadow rounded-lg p-6 animate-pulse"
              >
                <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((j) => (
                    <div key={j} className="h-20 bg-gray-100 rounded-lg"></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* Financial Overview */}
            <section className="bg-white shadow rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-6 py-3 border-b">
                <h2 className="text-lg font-semibold text-gray-900 font-['Poppins']">
                  Financial Overview
                </h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <StatCard
                    title={`Revenue (${periodLabels[period]})`}
                    value={formatCurrency(data.financial.revenue)}
                    trend={data.financial.revenueChangePercent}
                    trendLabel="vs prev"
                    color="default"
                  />
                  <StatCard
                    title="Avg Order Value"
                    value={formatCurrency(data.financial.avgOrderValue)}
                  />
                  <StatCard
                    title="Previous Period"
                    value={formatCurrency(data.financial.previousPeriodRevenue)}
                    subtitle="For comparison"
                  />
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-700 mb-2 font-medium">Revenue by Method</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-700">Card</span>
                        <span className="font-semibold text-gray-900">
                          {formatCurrency(data.financial.revenueByMethod.card)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Cash</span>
                        <span className="font-semibold text-gray-900">
                          {formatCurrency(data.financial.revenueByMethod.cash)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Check</span>
                        <span className="font-semibold text-gray-900">
                          {formatCurrency(data.financial.revenueByMethod.check)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Credit Acct</span>
                        <span className="font-semibold text-gray-900">
                          {formatCurrency(data.financial.revenueByMethod.credit)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Order Metrics */}
            <section className="bg-white shadow rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-6 py-3 border-b">
                <h2 className="text-lg font-semibold text-gray-900 font-['Poppins']">
                  Order Metrics
                </h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
                  <StatCard
                    title="Total Orders"
                    value={data.orders.totalOrders}
                  />
                  <StatCard
                    title="Total Completas"
                    value={data.orders.totalCompletas}
                  />
                  <StatCard
                    title="Avg Completas/Order"
                    value={data.orders.avgCompletasPerOrder.toFixed(1)}
                  />
                  <StatCard
                    title="Cancelled"
                    value={data.orders.cancelledCount}
                    color="red"
                  />
                  <StatCard
                    title="Cancelled Value"
                    value={formatCurrency(data.orders.cancelledValue)}
                    color="red"
                  />
                  <StatCard
                    title="Delivered"
                    value={data.orders.byStatus.delivered}
                    color="green"
                  />
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-2">Orders by Status</p>
                  <div className="flex flex-wrap gap-3">
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                      Pending: {data.orders.byStatus.pending}
                    </span>
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                      Confirmed: {data.orders.byStatus.confirmed}
                    </span>
                    <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                      Preparing: {data.orders.byStatus.preparing}
                    </span>
                    <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm">
                      Delivering: {data.orders.byStatus.outForDelivery}
                    </span>
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                      Delivered: {data.orders.byStatus.delivered}
                    </span>
                    <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm">
                      Cancelled: {data.orders.byStatus.cancelled}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* Fulfillment Stats */}
            <section className="bg-white shadow rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-6 py-3 border-b">
                <h2 className="text-lg font-semibold text-gray-900 font-['Poppins']">
                  Fulfillment Stats
                </h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                  <StatCard
                    title="Deliveries"
                    value={data.fulfillment.deliveryCount}
                  />
                  <StatCard
                    title="Pickups"
                    value={data.fulfillment.pickupCount}
                  />
                  <StatCard
                    title="Pickup Ratio"
                    value={formatPercent(data.fulfillment.pickupRatio)}
                  />
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-2">Orders by Day</p>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((day) => (
                        <div key={day} className="text-center flex-1">
                          <div className="text-xs text-gray-500">{DAYS[day]}</div>
                          <div className="font-bold text-gray-900">
                            {data.fulfillment.byDay[day] || 0}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Orders by Driver */}
                {data.fulfillment.byDriver.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-600 mb-2">Orders by Driver</p>
                    <div className="bg-gray-50 rounded-lg overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              Driver
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                              Orders
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {data.fulfillment.byDriver.map((driver) => (
                            <tr key={driver.driverId}>
                              <td className="px-4 py-2 text-sm text-gray-900">
                                {driver.driverName}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-900 text-right font-medium">
                                {driver.orderCount}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Customer Insights */}
            <section className="bg-white shadow rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-6 py-3 border-b">
                <h2 className="text-lg font-semibold text-gray-900 font-['Poppins']">
                  Customer Insights
                </h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <StatCard
                    title="Total Active Customers"
                    value={data.customers.totalActive}
                  />
                  <StatCard
                    title="New This Week"
                    value={data.customers.newThisWeek}
                    color="green"
                  />
                  <StatCard
                    title="New This Month"
                    value={data.customers.newThisMonth}
                    color="green"
                  />
                  <StatCard
                    title="Repeat Order Rate"
                    value={formatPercent(data.customers.repeatOrderRate)}
                    subtitle="Customers with 2+ orders"
                  />
                </div>
              </div>
            </section>

            {/* Menu Performance */}
            <section className="bg-white shadow rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-6 py-3 border-b">
                <h2 className="text-lg font-semibold text-gray-900 font-['Poppins']">
                  Menu Performance
                </h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <StatCard
                    title="Dessert Selection Rate"
                    value={formatPercent(data.menu.dessertSelectionRate)}
                    subtitle="% of completas with dessert"
                  />
                  <StatCard
                    title="Soup Selection Rate"
                    value={formatPercent(data.menu.soupSelectionRate)}
                    subtitle="% of completas with soup"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Top Entrees */}
                  <div className="bg-green-50 rounded-lg p-4">
                    <h3 className="font-semibold text-green-800 mb-2">
                      Top 5 Entrees
                    </h3>
                    {data.menu.topEntrees.length === 0 ? (
                      <p className="text-sm text-gray-500">No data</p>
                    ) : (
                      <ol className="space-y-1">
                        {data.menu.topEntrees.map((item, idx) => (
                          <li
                            key={item.id}
                            className="flex justify-between text-sm"
                          >
                            <span className="text-gray-700">
                              {idx + 1}. {item.name}
                            </span>
                            <span className="font-medium text-gray-900">
                              {item.count}
                            </span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>

                  {/* Top Sides */}
                  <div className="bg-orange-50 rounded-lg p-4">
                    <h3 className="font-semibold text-orange-800 mb-2">
                      Top 5 Sides
                    </h3>
                    {data.menu.topSides.length === 0 ? (
                      <p className="text-sm text-gray-500">No data</p>
                    ) : (
                      <ol className="space-y-1">
                        {data.menu.topSides.map((item, idx) => (
                          <li
                            key={item.id}
                            className="flex justify-between text-sm"
                          >
                            <span className="text-gray-700">
                              {idx + 1}. {item.name}
                            </span>
                            <span className="font-medium text-gray-900">
                              {item.count}
                            </span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>

                  {/* Least Popular */}
                  <div className="bg-red-50 rounded-lg p-4">
                    <h3 className="font-semibold text-red-800 mb-2">
                      Least Popular Items
                    </h3>
                    {data.menu.leastPopular.length === 0 ? (
                      <p className="text-sm text-gray-500">No data</p>
                    ) : (
                      <ol className="space-y-1">
                        {data.menu.leastPopular.map((item, idx) => (
                          <li
                            key={item.id}
                            className="flex justify-between text-sm"
                          >
                            <span className="text-gray-700">
                              {idx + 1}. {item.name}
                            </span>
                            <span className="font-medium text-gray-900">
                              {item.count}
                            </span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Operational / Prep Planning */}
            <section className="bg-white shadow rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-6 py-3 border-b">
                <h2 className="text-lg font-semibold text-gray-900 font-['Poppins']">
                  Operational / Prep Planning
                </h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
                  <StatCard
                    title="Upcoming Week Orders"
                    value={data.operational.upcomingWeekOrderCount}
                    subtitle="Orders for next/current week"
                  />
                  <div className="bg-gray-50 rounded-lg p-4 col-span-2 sm:col-span-1">
                    <p className="text-sm text-gray-600 mb-2">
                      Completas to Prep by Day
                    </p>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((day) => (
                        <div key={day} className="text-center flex-1">
                          <div className="text-xs text-gray-500">{DAYS[day]}</div>
                          <div className="font-bold text-gray-900">
                            {data.operational.completasByDay[day] || 0}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Peak Order Days */}
                {data.operational.peakOrderDays.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">
                      Peak Order Days (Last 30 Days)
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {data.operational.peakOrderDays.map((peak) => (
                        <div
                          key={peak.date}
                          className="bg-gray-50 rounded-lg px-3 py-2 text-center"
                        >
                          <div className="text-xs text-gray-500">
                            {formatDate(peak.date)}
                          </div>
                          <div className="font-bold text-gray-900">
                            {peak.count} orders
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
}
