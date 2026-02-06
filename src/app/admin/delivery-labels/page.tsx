"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { formatPhoneNumber } from "@/lib/formatPhone";

type WeeklyMenu = { id: string; weekStartDate: string; isPublished: boolean };
type Driver = { id: string; name: string };

type Label = {
  orderNumber: string;
  customerFirstName: string;
  customerLastName: string;
  phone: string | null;
  address: {
    street: string;
    unit: string | null;
    city: string;
    state: string;
    zipCode: string;
    deliveryNotes: string | null;
  } | null;
  driverName: string | null;
  stopNumber: number | null;
  weekStartDate: string;
  dayOfWeek: number;
  dayLabel: string;
  bagIndex: number;
  totalBags: number;
  orderIndex: number;
  orderTotal: number;
  entree: string | null;
  sides: string[];
  extraEntrees: string[];
  extraSides: string[];
  balanceDue: number;
  enteredDate: string;
};

const DAYS = [
  { num: 1, name: "Mon" },
  { num: 2, name: "Tue" },
  { num: 3, name: "Wed" },
  { num: 4, name: "Thu" },
  { num: 5, name: "Fri" },
];

function LabelCard({ label }: { label: Label }) {
  return (
    <div className="label-card border-2 border-black p-4 text-black flex flex-col justify-between" style={{ height: "44vh", pageBreakInside: "avoid" }}>
      {/* Row 1: Logo + Driver */}
      <div className="flex justify-between items-start border-b-2 border-black pb-2 mb-2">
        <div>
          <div className="text-2xl font-bold tracking-wide leading-tight">
            LAT<span className="text-red-600">I</span>N L<span className="text-red-600">I</span>TE
          </div>
          <div className="text-xs tracking-[0.2em] font-semibold">BY FAT BUSTERS</div>
        </div>
        <div className="border-2 border-black px-3 py-2 text-right">
          <div className="text-base"><span className="font-bold">Driver</span> <span className="font-bold uppercase">{label.driverName || "________"}</span></div>
          <div className="text-base"><span className="font-bold">Stop #:</span> {label.stopNumber ?? "____"}</div>
        </div>
      </div>

      {/* Row 2: Customer info */}
      <div className="grid grid-cols-3 gap-x-3 border-b border-black pb-2 mb-2 text-sm">
        <div><span className="font-bold">Last Name</span> <span className="uppercase">{label.customerLastName}</span></div>
        <div><span className="font-bold">First Name</span> <span className="uppercase">{label.customerFirstName}</span></div>
        <div><span className="font-bold">Home #:</span> {label.phone ? formatPhoneNumber(label.phone) : ""}</div>
      </div>

      {/* Row 3: Address */}
      <div className="grid grid-cols-4 gap-x-3 border-b border-black pb-2 mb-2 text-sm">
        <div className="col-span-2">
          <span className="font-bold">Address:</span> {label.address?.street || ""}
        </div>
        <div><span className="font-bold">St.</span></div>
        <div><span className="font-bold">Apt #</span> {label.address?.unit || ""}</div>
      </div>

      {/* Row 4: City + Driver Notes + Entered Date */}
      <div className="grid grid-cols-3 gap-x-3 border-b border-black pb-2 mb-2 text-sm">
        <div>{label.address?.city || ""}</div>
        <div><span className="font-bold">Driver Notes:</span> <span className="uppercase font-bold">{label.address?.deliveryNotes || ""}</span></div>
        <div><span className="font-bold italic">Entered Date:</span> <span className="italic">{label.enteredDate}</span></div>
      </div>

      {/* Row 5: Week/Day/Order */}
      <div className="border-2 border-black px-3 py-2 mb-2 flex justify-between text-sm">
        <span><span className="font-bold">Week of</span> {label.weekStartDate}</span>
        <span><span className="font-bold">Day:</span> {label.dayLabel}</span>
        <span><span className="font-bold">Order</span> {label.orderIndex} of {label.orderTotal}</span>
      </div>

      {/* Row 6: Meal contents */}
      <div className="grid grid-cols-2 gap-x-6 flex-1 text-sm">
        <div className="space-y-1">
          {label.entree && <div><span className="font-bold">Entree:</span> <span className="font-bold uppercase text-base">{label.entree}</span></div>}
          {label.sides.map((side, i) => (
            <div key={`s${i}`}><span className="font-bold">Side-{i + 1}:</span> <span className="font-bold uppercase text-base">{side}</span></div>
          ))}
        </div>
        <div className="space-y-1">
          {label.extraEntrees.map((e, i) => (
            <div key={`ee${i}`}><span className="font-bold">Entree Xtra {i + 1}:</span> <span className="uppercase">{e}</span></div>
          ))}
          {label.extraSides.map((s, i) => (
            <div key={`es${i}`}><span className="font-bold">Side Extra {i + 1}:</span> <span className="uppercase">{s}</span></div>
          ))}
          {label.balanceDue > 0 && (
            <div className="border-2 border-black px-3 py-2 mt-2 text-right">
              <span className="font-bold text-base">Balance Due:</span> <span className="font-bold text-lg">${label.balanceDue.toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t-2 border-black pt-2 text-center italic text-xs mt-2">
        For your safety, refrigerate as soon as possible. Microwave max for 50 sec. Container could melt!
      </div>
    </div>
  );
}

export default function DeliveryLabelsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-gray-500">Loading...</div>}>
      <DeliveryLabelsContent />
    </Suspense>
  );
}

function DeliveryLabelsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [menus, setMenus] = useState<WeeklyMenu[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedMenuId, setSelectedMenuId] = useState(searchParams.get("weeklyMenuId") || "");
  const [selectedDay, setSelectedDay] = useState(Number(searchParams.get("dayOfWeek")) || 1);
  const [selectedDriverId, setSelectedDriverId] = useState(searchParams.get("driverId") || "");
  const [labels, setLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/weekly-menus").then((r) => { if (r.status === 401) { router.push("/login"); return []; } return r.json(); }),
      fetch("/api/admin/drivers?activeOnly=true").then((r) => r.json()),
    ]).then(([menuData, driverData]) => {
      const published = (menuData || []).filter((m: WeeklyMenu) => m.isPublished);
      setMenus(published);
      if (!selectedMenuId && published.length > 0) setSelectedMenuId(published[0].id);
      setDrivers(driverData || []);
    }).catch(() => setError("Failed to load data"));
  }, []);

  useEffect(() => {
    if (!selectedMenuId) return;
    setLoading(true);
    setError("");
    const params = new URLSearchParams({
      weeklyMenuId: selectedMenuId,
      dayOfWeek: String(selectedDay),
    });
    if (selectedDriverId) params.set("driverId", selectedDriverId);

    fetch(`/api/admin/delivery-labels?${params}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setLabels)
      .catch(() => setError("Failed to load labels"))
      .finally(() => setLoading(false));
  }, [selectedMenuId, selectedDay, selectedDriverId]);

  return (
    <>
      <style jsx global>{`
        @media print {
          body { margin: 0; padding: 0; }
          .print-controls { display: none !important; }
          .label-card { page-break-inside: avoid; }
          .label-pair { page-break-after: always; }
          .label-pair:last-child { page-break-after: auto; }
        }
      `}</style>

      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
        <div className="print-controls">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Delivery Labels</h1>
            <div className="flex gap-3">
              <Link href="/admin/delivery-manifest" className="px-4 py-2 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 uppercase font-semibold transition-colors">
                BACK TO MANIFEST
              </Link>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-gray-800 text-white rounded-full hover:bg-gray-900 uppercase font-semibold transition-colors"
              >
                PRINT LABELS
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
              {error}
            </div>
          )}

          <div className="flex flex-wrap gap-3 mb-6">
            <select
              value={selectedMenuId}
              onChange={(e) => setSelectedMenuId(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-gray-900 text-sm"
            >
              {menus.map((m) => (
                <option key={m.id} value={m.id}>
                  Week of {new Date(m.weekStartDate).toLocaleDateString()}
                </option>
              ))}
            </select>

            <div className="flex gap-1">
              {DAYS.map((d) => (
                <button
                  key={d.num}
                  onClick={() => setSelectedDay(d.num)}
                  className={`px-3 py-2 rounded-md text-sm ${
                    selectedDay === d.num
                      ? "bg-latin-orange text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {d.name}
                </button>
              ))}
            </div>

            <select
              value={selectedDriverId}
              onChange={(e) => setSelectedDriverId(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-gray-900 text-sm"
            >
              <option value="">All Drivers</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <p className="text-gray-500 print-controls">Loading...</p>
        ) : labels.length === 0 ? (
          <p className="text-gray-500 print-controls">No labels for this day.</p>
        ) : (
          <div>
            {/* Render labels in pairs (2 per page) */}
            {Array.from({ length: Math.ceil(labels.length / 2) }, (_, pairIdx) => {
              const first = labels[pairIdx * 2];
              const second = labels[pairIdx * 2 + 1];
              return (
                <div key={pairIdx} className="label-pair flex flex-col justify-center" style={{ height: "100vh" }}>
                  <LabelCard label={first} />
                  {second && (
                    <>
                      <div className="border-t border-dashed border-gray-300 my-3 print:border-transparent" />
                      <LabelCard label={second} />
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
        </div>
      </div>
    </>
  );
}
