import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Pages that logged-in users should not see (redirect to dashboard)
const guestOnlyPages = ["/login", "/register"];

// Pages that require any authenticated user
const customerAuthPrefixes = ["/account", "/orders", "/order"];

// Admin page prefix
const adminPrefix = "/admin";

// Public API routes (no auth needed)
const publicApiPrefixes = [
  "/api/auth",
  "/api/pricing",
  "/api/menus",
  "/api/upcoming-meals",
  "/api/stripe/webhook",
];

// Admin API prefix
const adminApiPrefix = "/api/admin";

// Customer API routes (require authentication)
const protectedApiPrefixes = [
  "/api/profile",
  "/api/addresses",
  "/api/orders",
  "/api/stripe/create-payment-intent",
];

function startsWithAny(pathname: string, prefixes: string[]): boolean {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
  );
}

export default auth((req) => {
  const { nextUrl } = req;
  const pathname = nextUrl.pathname;
  const session = req.auth;
  const isLoggedIn = !!session;
  const isAdmin = session?.user?.role === "ADMIN";
  const isApiRoute = pathname.startsWith("/api/");

  // === API ROUTES ===
  if (isApiRoute) {
    // Public APIs: allow through
    if (startsWithAny(pathname, publicApiPrefixes)) {
      return NextResponse.next();
    }

    // Admin APIs: require ADMIN role
    if (
      pathname === adminApiPrefix ||
      pathname.startsWith(adminApiPrefix + "/")
    ) {
      if (!isLoggedIn) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (!isAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.next();
    }

    // Protected customer APIs: require authentication
    if (startsWithAny(pathname, protectedApiPrefixes)) {
      if (!isLoggedIn) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return NextResponse.next();
    }

    // Any other API route: allow through
    return NextResponse.next();
  }

  // === PAGE ROUTES ===

  // Guest-only pages: redirect logged-in users to their dashboard
  if (startsWithAny(pathname, guestOnlyPages)) {
    if (isLoggedIn) {
      const redirectTo = isAdmin ? "/admin" : "/orders";
      return NextResponse.redirect(new URL(redirectTo, nextUrl));
    }
    return NextResponse.next();
  }

  // Admin pages: require ADMIN role
  if (pathname === adminPrefix || pathname.startsWith(adminPrefix + "/")) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", nextUrl));
    }
    if (!isAdmin) {
      return NextResponse.redirect(new URL("/", nextUrl));
    }
    return NextResponse.next();
  }

  // Customer-authenticated pages: require any session
  if (startsWithAny(pathname, customerAuthPrefixes)) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", nextUrl));
    }
    return NextResponse.next();
  }

  // All other pages (/, /menu, /upcoming, /forgot-password, /reset-password): public
  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
