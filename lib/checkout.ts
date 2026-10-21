import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const round2 = (n: number) => Math.round(n * 100) / 100;

export type Zone = { city: string; deliveryFee: number; estimatedDays: string; isPickup: boolean };

export async function getDeliveryZones(): Promise<Zone[]> {
  const zones = await prisma.deliveryZone.findMany({ where: { isActive: true }, orderBy: { city: "asc" } });
  return zones.map((z) => ({ city: z.city, deliveryFee: z.deliveryFee.toNumber(), estimatedDays: z.estimatedDays, isPickup: z.isPickup }));
}

/** Delivery fee for a city + method; null when the city isn't served (or pickup isn't offered there). */
export function deliveryFeeFor(zones: Zone[], city: string, method: "delivery" | "pickup") {
  const zone = zones.find((z) => z.city === city);
  if (!zone) return null;
  if (method === "pickup") return zone.isPickup ? 0 : null;
  return zone.deliveryFee;
}

export type CouponCheck =
  | { ok: true; id: string; code: string; discount: number; label: string; maxUses: number | null }
  | { ok: false; error: string };

/** All coupon rules in one place: active, not expired, usage left, minimum spend. */
export async function checkCoupon(rawCode: string, subtotal: number, db: Prisma.TransactionClient = prisma): Promise<CouponCheck> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { ok: false, error: "Enter a discount code." };
  const coupon = await db.coupon.findFirst({ where: { code: { equals: code, mode: "insensitive" } } });
  if (!coupon || !coupon.isActive) return { ok: false, error: `“${code}” isn't a valid discount code.` };
  if (coupon.expiresAt && coupon.expiresAt < new Date()) return { ok: false, error: `“${code}” has expired.` };
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    return { ok: false, error: `“${code}” has already been used the maximum number of times.` };
  }
  const min = coupon.minOrderAmount?.toNumber() ?? 0;
  if (subtotal < min) {
    return { ok: false, error: `Spend GH₵${min.toLocaleString("en-GH")} or more to use “${code}” — add GH₵${round2(min - subtotal).toLocaleString("en-GH")} more.` };
  }
  const value = coupon.value.toNumber();
  const discount = coupon.type === "PERCENTAGE" ? round2((subtotal * value) / 100) : Math.min(value, subtotal);
  const label = coupon.type === "PERCENTAGE" ? `${value}% off` : `GH₵${value.toLocaleString("en-GH")} off`;
  return { ok: true, id: coupon.id, code: coupon.code, discount, label, maxUses: coupon.maxUses };
}

export function orderTotal(subtotal: number, deliveryFee: number, discount: number) {
  return round2(Math.max(0, subtotal - discount) + deliveryFee);
}

/** NTD-0001, NTD-0002… (callers retry on the rare clash). */
export async function nextOrderNumber(db: Prisma.TransactionClient) {
  const last = await db.order.findFirst({ orderBy: { createdAt: "desc" }, select: { orderNumber: true } });
  const n = Number(last?.orderNumber.match(/(\d+)$/)?.[1] ?? 0) + 1;
  return `NTD-${String(n).padStart(4, "0")}`;
}

// ---- Private order links ----
// The order page needs this key, so nobody can view an order by guessing its number.

function secret() {
  const s = process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error("NEXTAUTH_SECRET is not set");
  return s;
}

export function orderKey(orderId: string) {
  return createHmac("sha256", secret()).update(`order:${orderId}`).digest("base64url").slice(0, 32);
}

export function isValidOrderKey(orderId: string, key: string | undefined) {
  if (!key) return false;
  const expected = Buffer.from(orderKey(orderId));
  const given = Buffer.from(key);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export const orderPath = (order: { id: string; orderNumber: string }) => `/order/${order.orderNumber}?key=${orderKey(order.id)}`;
