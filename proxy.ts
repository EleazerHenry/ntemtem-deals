import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Optimistic gate only: reads the session cookie, no database. The real check
// is requireAdmin() in lib/dal.ts, called by every admin page and action.
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
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
  matcher: ["/admin", "/admin/:path*"],
};
