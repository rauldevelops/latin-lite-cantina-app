"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  {
    label: "Dashboard",
    href: "/admin/dashboard",
    icon: "📊",
  },
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
  const [collapsed, setCollapsed] = useState(false);

  // Default to collapsed on small screens
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 768px)");
    setCollapsed(mql.matches);

    function handleChange(e: MediaQueryListEvent) {
      setCollapsed(e.matches);
    }
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, []);

  function isActive(href: string) {
    if (href === "/admin/orders") {
      return pathname === "/admin/orders" || (pathname?.startsWith("/admin/orders/") && !pathname.includes("/create"));
    }
    return pathname?.startsWith(href);
  }

  return (
    <aside
      className={`${
        collapsed ? "w-16" : "w-64"
      } bg-[#1a1a1a] flex-shrink-0 sticky top-0 h-screen overflow-y-auto transition-all duration-200`}
    >
      <div className={`border-b border-gray-700 flex items-center ${collapsed ? "justify-center p-3" : "justify-between p-4"}`}>
        {!collapsed && (
          <Link href="/admin/dashboard" className="text-white font-bold text-lg truncate">
            Admin Dashboard
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-gray-400 hover:text-white flex-shrink-0 p-1"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7M19 19l-7-7 7-7" />
            </svg>
          )}
        </button>
      </div>
      <nav className="p-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            title={collapsed ? item.label : undefined}
            className={`flex items-center ${
              collapsed ? "justify-center px-2" : "gap-3 px-4"
            } py-2.5 rounded-lg text-sm font-medium transition-colors mb-1 ${
              isActive(item.href)
                ? "bg-latin-red text-white"
                : "text-gray-300 hover:bg-gray-700 hover:text-white"
            }`}
          >
            <span className="text-lg flex-shrink-0">{item.icon}</span>
            {!collapsed && <span className="truncate">{item.label}</span>}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
