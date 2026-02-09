"use client";

import { useState } from "react";
import Link from "next/link";

type DailyBreakdown = Record<number, { mealCount: number; deliveryCount: number }>;

type DriverPay = {
  driverId: string;
  driverName: string;
  dailyBreakdown: DailyBreakdown;
  totalMeals: number;
  totalDeliveries: number;
  totalPay: number;
};

type PayReport = {
  weekStartDate: string;
  deliveryFeePerMeal: number;
  drivers: DriverPay[];
  totalMealsAllDrivers: number;
  totalPayAllDrivers: number;
};

const DAYS = [
  { num: 1, label: "Monday" },
  { num: 2, label: "Tuesday" },
  { num: 3, label: "Wednesday" },
  { num: 4, label: "Thursday" },
  { num: 5, label: "Friday" },
];

export default function DriverPayReportPage() {
  const [selectedWeek, setSelectedWeek] = useState<string>(() => {
    // Default to current week's Monday
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
    return monday.toISOString().split("T")[0];
  });

  const [report, setReport] = useState<PayReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadReport() {
    if (!selectedWeek) {
      setError("Please select a week");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/admin/drivers/pay-report?weekStartDate=${selectedWeek}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to load report");
      }

      const data = await res.json();
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load report");
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header - hidden when printing */}
        <div className="mb-6 print:hidden">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Driver Pay Report</h1>
              <p className="text-gray-600 mt-1">View driver compensation by week</p>
            </div>
            <Link
              href="/admin/drivers"
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              BACK TO DRIVERS
            </Link>
          </div>

          {/* Week Selector */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label htmlFor="weekStartDate" className="block text-sm font-medium text-gray-700 mb-2">
                  Week Starting (Monday)
                </label>
                <input
                  type="date"
                  id="weekStartDate"
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(e.target.value)}
                  className="w-full px-3 py-2 border text-gray-700 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={loadReport}
                disabled={loading}
                className="px-6 py-2 bg-latin-red text-white rounded-full hover:bg-latin-orange uppercase font-semibold transition-colors disabled:opacity-50"
              >
                {loading ? "LOADING..." : "GENERATE REPORT"}
              </button>
              {report && (
                <button
                  onClick={() => window.print()}
                  className="px-6 py-2 bg-latin-red text-white rounded-full hover:bg-latin-orange uppercase font-semibold transition-colors"
                >
                  PRINT REPORT
                </button>
              )}
            </div>

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Report Content */}
        {report && (
          <div className="bg-white rounded-lg shadow print:shadow-none">
            {/* Print Header */}
            <div className="hidden print:block p-6 border-b">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Latin Lite Driver Pay Report</h1>
              <p className="text-gray-600">
                Week of {formatDate(report.weekStartDate)} • Rate: {formatCurrency(report.deliveryFeePerMeal)} per meal
              </p>
            </div>

            {/* Summary */}
            <div className="p-6 border-b bg-blue-50 print:bg-white">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Summary</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white print:bg-gray-50 rounded-lg p-4 shadow-sm print:shadow-none">
                  <p className="text-sm text-gray-600">Rate per Meal</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(report.deliveryFeePerMeal)}
                  </p>
                </div>
                <div className="bg-white print:bg-gray-50 rounded-lg p-4 shadow-sm print:shadow-none">
                  <p className="text-sm text-gray-600">Total Meals Delivered</p>
                  <p className="text-2xl font-bold text-gray-900">{report.totalMealsAllDrivers}</p>
                </div>
                <div className="bg-white print:bg-gray-50 rounded-lg p-4 shadow-sm print:shadow-none">
                  <p className="text-sm text-gray-600">Total Pay</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(report.totalPayAllDrivers)}
                  </p>
                </div>
              </div>
            </div>

            {/* Driver Breakdown */}
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">By Driver</h2>

              {report.drivers.length === 0 ? (
                <p className="text-gray-600 text-center py-8">
                  No deliveries found for this week.
                </p>
              ) : (
                <div className="space-y-6">
                  {report.drivers.map((driver) => (
                    <div key={driver.driverId} className="border rounded-lg overflow-hidden">
                      {/* Driver Header */}
                      <div className="bg-gray-100 print:bg-gray-50 px-4 py-3 flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{driver.driverName}</h3>
                          <p className="text-sm text-gray-600">
                            {driver.totalDeliveries} {driver.totalDeliveries === 1 ? "delivery" : "deliveries"} • {driver.totalMeals} meals
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Total Pay</p>
                          <p className="text-xl font-bold text-green-600">
                            {formatCurrency(driver.totalPay)}
                          </p>
                        </div>
                      </div>

                      {/* Daily Breakdown Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 print:bg-gray-100">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">
                                Day
                              </th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 uppercase">
                                Deliveries
                              </th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 uppercase">
                                Meals
                              </th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 uppercase">
                                Pay
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {DAYS.map((day) => {
                              const dayData = driver.dailyBreakdown[day.num];
                              if (!dayData || dayData.mealCount === 0) {
                                return (
                                  <tr key={day.num} className="text-gray-400">
                                    <td className="px-4 py-2 text-sm">{day.label}</td>
                                    <td className="px-4 py-2 text-sm text-right">—</td>
                                    <td className="px-4 py-2 text-sm text-right">—</td>
                                    <td className="px-4 py-2 text-sm text-right">—</td>
                                  </tr>
                                );
                              }

                              return (
                                <tr key={day.num}>
                                  <td className="px-4 py-2 text-sm font-medium text-gray-900">
                                    {day.label}
                                  </td>
                                  <td className="px-4 py-2 text-sm text-right text-gray-600">
                                    {dayData.deliveryCount}
                                  </td>
                                  <td className="px-4 py-2 text-sm text-right text-gray-900">
                                    {dayData.mealCount}
                                  </td>
                                  <td className="px-4 py-2 text-sm text-right font-medium text-gray-900">
                                    {formatCurrency(dayData.mealCount * report.deliveryFeePerMeal)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot className="bg-gray-50 print:bg-gray-100">
                            <tr>
                              <td className="px-4 py-2 text-sm font-semibold text-gray-900">Total</td>
                              <td className="px-4 py-2 text-sm text-right font-semibold text-gray-900">
                                {driver.totalDeliveries}
                              </td>
                              <td className="px-4 py-2 text-sm text-right font-semibold text-gray-900">
                                {driver.totalMeals}
                              </td>
                              <td className="px-4 py-2 text-sm text-right font-bold text-green-600">
                                {formatCurrency(driver.totalPay)}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Grand Total */}
            {report.drivers.length > 1 && (
              <div className="p-6 border-t bg-gray-50 print:bg-white">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Grand Total</h3>
                    <p className="text-sm text-gray-600">
                      {report.drivers.length} {report.drivers.length === 1 ? "driver" : "drivers"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">{report.totalMealsAllDrivers} meals delivered</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(report.totalPayAllDrivers)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body {
            background: white;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
          .print\\:bg-white {
            background-color: white !important;
          }
          .print\\:bg-gray-50 {
            background-color: #f9fafb !important;
          }
          .print\\:bg-gray-100 {
            background-color: #f3f4f6 !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
}
