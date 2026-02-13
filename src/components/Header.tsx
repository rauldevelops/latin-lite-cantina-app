"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";

export default function Header() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const user = session?.user;
  const loading = status === "loading";
  const isAdmin = user?.role === "ADMIN";
  const isAdminPage = pathname?.startsWith("/admin");

  async function handleLogout() {
    setLoggingOut(true);
    await signOut({ callbackUrl: "/" });
  }

  function navLinkClass(active: boolean) {
    return `text-sm font-medium transition-colors ${
      active ? "text-latin-red" : "text-gray-700 hover:text-latin-red"
    }`;
  }

  function mobileNavLinkClass(active: boolean) {
    return `block px-3 py-2 rounded-md text-base font-medium transition-colors ${
      active
        ? "text-latin-red bg-orange-50"
        : "text-gray-700 hover:text-latin-red hover:bg-gray-50"
    }`;
  }

  // On admin pages, show a minimal header
  if (isAdminPage) {
    return (
      <header className="bg-[#1a1a1a] border-b border-gray-700 print:hidden">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-lg font-bold text-latin-red">
                LatinLite Cantina
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
    <header className="bg-white shadow-sm border-b border-gray-200 print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo / Brand */}
          <Link href="/" className="flex items-center">
            <span className="text-xl font-bold text-latin-red">
              LatinLite Cantina
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/menu" className={navLinkClass(pathname === "/menu")}>
              Menu
            </Link>
            <Link href="/order" className={navLinkClass(pathname?.startsWith("/order") ?? false)}>
              Order
            </Link>
            {user && (
              <>
                <Link href="/upcoming" className={navLinkClass(pathname === "/upcoming")}>
                  Upcoming
                </Link>
                <Link href="/orders" className={navLinkClass(pathname?.startsWith("/orders") ?? false)}>
                  My Orders
                </Link>
                <Link href="/account" className={navLinkClass(pathname === "/account")}>
                  Account
                </Link>
              </>
            )}
            {isAdmin && (
              <Link href="/admin" className="text-sm font-medium text-gray-700 hover:text-latin-red transition-colors">
                Admin
              </Link>
            )}
          </nav>

          {/* Desktop User Actions */}
          <div className="hidden md:flex items-center gap-4">
            {loading ? (
              <div className="w-20 h-8 bg-gray-100 rounded animate-pulse" />
            ) : user ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-700 hidden lg:block">
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
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-latin-red transition-colors"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 text-sm font-semibold text-white bg-latin-red rounded-full hover:bg-latin-orange uppercase transition-colors"
                >
                  SIGN UP
                </Link>
              </div>
            )}
          </div>

          {/* Mobile hamburger button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-md text-gray-700 hover:text-latin-red hover:bg-gray-100 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu panel */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200">
          <div className="px-4 py-3 space-y-1">
            <Link
              href="/menu"
              onClick={() => setMobileMenuOpen(false)}
              className={mobileNavLinkClass(pathname === "/menu")}
            >
              Menu
            </Link>
            <Link
              href="/order"
              onClick={() => setMobileMenuOpen(false)}
              className={mobileNavLinkClass(pathname?.startsWith("/order") ?? false)}
            >
              Order
            </Link>
            {user && (
              <>
                <Link
                  href="/upcoming"
                  onClick={() => setMobileMenuOpen(false)}
                  className={mobileNavLinkClass(pathname === "/upcoming")}
                >
                  Upcoming
                </Link>
                <Link
                  href="/orders"
                  onClick={() => setMobileMenuOpen(false)}
                  className={mobileNavLinkClass(pathname?.startsWith("/orders") ?? false)}
                >
                  My Orders
                </Link>
                <Link
                  href="/account"
                  onClick={() => setMobileMenuOpen(false)}
                  className={mobileNavLinkClass(pathname === "/account")}
                >
                  Account
                </Link>
              </>
            )}
            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className={mobileNavLinkClass(pathname?.startsWith("/admin") ?? false)}
              >
                Admin
              </Link>
            )}
          </div>

          {/* Mobile user actions */}
          <div className="border-t border-gray-200 px-4 py-3">
            {loading ? (
              <div className="w-32 h-8 bg-gray-100 rounded animate-pulse" />
            ) : user ? (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">
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
              <div className="flex gap-3">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 text-center px-3 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-full hover:bg-gray-200 uppercase transition-colors"
                >
                  LOGIN
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 text-center px-3 py-2 text-sm font-semibold text-white bg-latin-red rounded-full hover:bg-latin-orange uppercase transition-colors"
                >
                  SIGN UP
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
