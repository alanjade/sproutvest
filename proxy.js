import { NextResponse } from "next/server";

// ─── Routes config ────────────────────────────────────────────────────────────

const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/register",
  "/verify-email",
  "/email-verified",
  "/forgot-password",
  "/reset-verify",
  "/set-new-password",
  "/support",
  "/terms",
  "/privacy",
];

const ADMIN_ROUTES = ["/admin"];

// ─── Middleware ───────────────────────────────────────────────────────────────

export function proxy(request) {
  const { pathname } = request.nextUrl;

  const token    = request.cookies.get("auth_token")?.value;
  const userRole = request.cookies.get("user_role")?.value;

  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
  const isAdminRoute = ADMIN_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  // ── Not logged in, trying to access protected route ──
  if (!token && !isPublicRoute) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── Logged in, trying to access auth pages ──
  if (token && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // ── Trying to access admin routes without admin role ──
  if (isAdminRoute && token && userRole !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};