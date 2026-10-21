import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { resetPasswordMessage, sendEmail, verifyEmailMessage } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { createToken, passwordFingerprint } from "@/lib/tokens";

/** The signed-in shopper (any role), re-read from the database. */
export const getCustomer = cache(async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, phone: true, emailVerified: true, role: true, createdAt: true },
  });
});

export async function requireCustomer(next = "/account") {
  const customer = await getCustomer();
  if (!customer) redirect(`/account/login?callbackUrl=${encodeURIComponent(next)}`);
  return customer;
}

/**
 * Base URL for links in emails. Never taken from request headers in production:
 * a forged Host header would put an attacker's domain (and a reset token) in the email.
 */
async function origin() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  const host = (await headers()).get("host") ?? "localhost:3000"; // local development only
  return `http://${host}`;
}

export async function sendVerificationEmail(user: { id: string; name: string; email: string }) {
  const token = createToken("verify-email", user, 3 * 24 * 60);
  const url = `${await origin()}/account/verify?token=${token}`;
  return sendEmail({ to: user.email, ...verifyEmailMessage(user.name, url) });
}

export async function sendPasswordResetEmail(user: { id: string; name: string; email: string; passwordHash: string | null }) {
  const token = createToken("reset-password", user, 60, passwordFingerprint(user.passwordHash));
  const url = `${await origin()}/account/reset?token=${token}`;
  return sendEmail({ to: user.email, ...resetPasswordMessage(user.name, url) });
}

/**
 * Only after the email is proven to be theirs: guest orders placed with it
 * move into the account. Returns how many were added.
 */
export async function attachGuestOrders(userId: string, email: string) {
  const orders = await prisma.order.findMany({
    where: { userId: null, guestEmail: { equals: email, mode: "insensitive" } },
    select: { id: true, addressId: true },
  });
  if (!orders.length) return 0;
  await prisma.$transaction([
    prisma.order.updateMany({ where: { id: { in: orders.map((o) => o.id) } }, data: { userId } }),
    prisma.address.updateMany({
      where: { id: { in: orders.flatMap((o) => (o.addressId ? [o.addressId] : [])) }, userId: null },
      data: { userId },
    }),
  ]);
  return orders.length;
}
