import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Optimistic gates only: they read the session cookie, no database. The real
// checks are requireAdmin() (lib/dal.ts) and requireCustomer() (lib/account.ts).
const PUBLIC_ACCOUNT = ["/account/login", "/account/register", "/account/forgot", "/account/reset", "/account/verify"];

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  if (pathname === "/account" || pathname.startsWith("/account/")) {
    const isPublic = PUBLIC_ACCOUNT.some((p) => pathname === p);
    // Signed-in shoppers don't need the sign-in / register pages
    if (token && (pathname === "/account/login" || pathname === "/account/register")) {
      return NextResponse.redirect(new URL("/account", request.url));
    }
    if (!isPublic && !token) {
      const login = new URL("/account/login", request.url);
      login.searchParams.set("callbackUrl", pathname + search);
      return NextResponse.redirect(login);
    }
    return NextResponse.next();
  }

  // Admin
  const isAdmin = token?.role === "ADMIN";
  if (pathname === "/admin/login") {
    return isAdmin ? NextResponse.redirect(new URL("/admin", request.url)) : NextResponse.next();
  }
  if (!isAdmin) {
    const login = new URL("/admin/login", request.url);
    login.searchParams.set("callbackUrl", pathname + search);
    if (token) login.searchParams.set("error", "not-admin");
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/account", "/account/:path*"],
};
