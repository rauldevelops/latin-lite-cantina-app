"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";

export default function Header() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [loggingOut, setLoggingOut] = useState(false);

  const user = session?.user;
  const loading = status === "loading";
  const isAdmin = user?.role === "ADMIN";
  const isAdminPage = pathname?.startsWith("/admin");

  async function handleLogout() {
    setLoggingOut(true);
    await signOut({ callbackUrl: "/" });
  }

  // On admin pages, show a minimal header
  if (isAdminPage) {
    return (
      <header className="bg-gray-900 border-b border-gray-800">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-lg font-bold text-green-400">
                Latin Lite Cantina
              </span>
              <span className="text-gray-500">|</span>
              <span className="text-sm text-gray-400">Admin</span>
            </Link>

            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="text-sm text-gray-400 hover:text-white"
              >
                View Site
              </Link>
              {user && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-400 hidden sm:block">
                    {user.name || user.email}
                  </span>
                  <button
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="px-3 py-1.5 text-sm font-medium text-gray-300 bg-gray-800 rounded-md hover:bg-gray-700 disabled:opacity-50"
                  >
                    {loggingOut ? "..." : "Logout"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
    );
  }

  // Regular header for customer-facing pages
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo / Brand */}
          <Link href="/" className="flex items-center">
            <span className="text-xl font-bold text-green-600">
              Latin Lite Cantina
            </span>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-6">
            <Link
              href="/menu"
              className={`text-sm font-medium ${
                pathname === "/menu"
                  ? "text-green-600"
                  : "text-gray-700 hover:text-green-600"
              }`}
            >
              Menu
            </Link>
            {user && (
              <Link
                href="/order"
                className={`text-sm font-medium ${
                  pathname?.startsWith("/order")
                    ? "text-green-600"
                    : "text-gray-700 hover:text-green-600"
                }`}
              >
                Order
              </Link>
            )}
            {isAdmin && (
              <Link
                href="/admin"
                className="text-sm font-medium text-gray-700 hover:text-green-600"
              >
                Admin
              </Link>
            )}
          </nav>

          {/* User Actions */}
          <div className="flex items-center gap-4">
            {loading ? (
              <div className="w-20 h-8 bg-gray-100 rounded animate-pulse" />
            ) : user ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-700 hidden sm:block">
                  {user.name || user.email}
                </span>
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
                >
                  {loggingOut ? "..." : "Logout"}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-green-600"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
