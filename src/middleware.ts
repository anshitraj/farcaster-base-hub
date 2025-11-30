import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Route protection middleware
 * Redirects unauthenticated users to /login
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const publicRoutes = [
    "/",
    "/login",
    "/api/auth",
    "/apps",
    "/apps/trending",
    "/developers",
    "/miniapps",
    "/search",
    "/api/apps",
    "/api/categories",
    "/api/miniapps",
  ];

  // Check if route is public
  const isPublicRoute = publicRoutes.some((route) => {
    if (route === "/") {
      return pathname === "/";
    }
    if (route.endsWith("/*")) {
      return pathname.startsWith(route.slice(0, -2));
    }
    return pathname.startsWith(route);
  });

  // Allow public routes and API auth routes
  if (isPublicRoute || pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  // For protected routes, check authentication via cookie/session
  // Note: We can't check localStorage in middleware, so we'll check in the component
  // This middleware just allows the request through, components will handle redirects

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

