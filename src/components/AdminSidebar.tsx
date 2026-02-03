"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  {
    label: "Orders",
    href: "/admin/orders",
    icon: "📋",
  },
  {
    label: "Create Order",
    href: "/admin/orders/create",
    icon: "➕",
  },
  {
    label: "Customers",
    href: "/admin/customers",
    icon: "👥",
  },
  {
    label: "Weekly Menus",
    href: "/admin/weekly-menus",
    icon: "📅",
  },
  {
    label: "Menu Items",
    href: "/admin/menu-items",
    icon: "🍽️",
  },
  {
    label: "Pricing",
    href: "/admin/pricing",
    icon: "💰",
  },
  {
    label: "Prep Sheets",
    href: "/admin/prep-sheets",
    icon: "📝",
  },
  {
    label: "Delivery Manifest",
    href: "/admin/delivery-manifest",
    icon: "🚚",
  },
  {
    label: "Delivery Labels",
    href: "/admin/delivery-labels",
    icon: "🏷️",
  },
  {
    label: "Drivers",
    href: "/admin/drivers",
    icon: "🚗",
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/admin/orders") {
      // Special case: only highlight "Orders" for the exact path or order detail pages
      return pathname === "/admin/orders" || (pathname?.startsWith("/admin/orders/") && !pathname.includes("/create"));
    }
    return pathname?.startsWith(href);
  }

  return (
    <aside className="w-64 bg-gray-900 min-h-screen flex-shrink-0">
      <div className="p-4 border-b border-gray-800">
        <Link href="/admin/orders" className="text-white font-bold text-lg">
          Admin Dashboard
        </Link>
      </div>
      <nav className="p-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors mb-1 ${
              isActive(item.href)
                ? "bg-green-600 text-white"
                : "text-gray-300 hover:bg-gray-800 hover:text-white"
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
