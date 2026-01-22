import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isAdminRoute = req.nextUrl.pathname.startsWith("/admin");
  
  if (isAdminRoute) {
    if (!req.auth) {
      // Not logged in - redirect to login
      return NextResponse.redirect(new URL("/login", req.url));
    }
    
    // Check if user has admin role
    // Note: You'll need to add role to the session token
    // For now, we'll check in the page components
  }
  
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};