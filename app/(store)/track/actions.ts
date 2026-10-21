"use server";

import { orderPath } from "@/lib/checkout";
import { prisma } from "@/lib/prisma";
import { LIMITS, clientIp, hit, waitLabel } from "@/lib/rate-limit";

export type LookupResult = { ok: true; redirectTo: string } | { ok: false; error: string };

/** "NTD-0012", "ntd 12", "12" -> "NTD-0012" */
function normaliseNumber(raw: string) {
  const digits = String(raw).match(/(\d{1,8})\s*$/)?.[1];
  return digits ? `NTD-${digits.padStart(4, "0")}` : null;
}

export async function lookupOrder(input: { orderNumber: string; email: string }): Promise<LookupResult> {
  const orderNumber = normaliseNumber(input.orderNumber ?? "");
  const email = String(input.email ?? "").trim().toLowerCase();
  if (!orderNumber) return { ok: false, error: "Enter your order number — it looks like NTD-0012." };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, error: "Enter the email you used when ordering." };
  const limit = await hit(`track:ip:${await clientIp()}`, LIMITS.trackPerIp);
  if (!limit.ok) return { ok: false, error: `Too many lookups. Try again in ${waitLabel(limit.retryAfterSeconds)}.` };

  const order = await prisma.order.findFirst({
    where: { orderNumber, guestEmail: { equals: email, mode: "insensitive" } },
    select: { id: true, orderNumber: true },
  });
  // Same answer whether the number or the email is wrong — no fishing for orders
  if (!order) return { ok: false, error: "We couldn't find an order with that number and email. Check both and try again." };
  return { ok: true, redirectTo: orderPath(order) };
}
