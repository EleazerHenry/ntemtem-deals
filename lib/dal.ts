import "server-only";
import { cache } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * The real admin gate. proxy.ts only does a fast cookie check; every admin
 * page, server action and /api/admin route must call this. It re-reads the
 * user from the database so a removed or demoted admin loses access at once
 * instead of when their 30-day token expires.
 */
export const getAdmin = cache(async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, role: true },
  });
  return user?.role === "ADMIN" ? user : null;
});

/** For admin pages and server actions: redirects to login if not an admin. */
export async function requireAdmin() {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}
