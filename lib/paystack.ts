import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Paystack: card + every Mobile Money network in one integration.
// Amounts go to Paystack in pesewas (GH₵1 = 100).

const API = process.env.PAYSTACK_API_URL ?? "https://api.paystack.co"; // overridable for local testing only

/**
 * null when keys are missing, placeholders or half-pasted — checkout then shows
 * "online payment is being switched on" instead of a Pay button that fails.
 * Real secret keys are sk_test_/sk_live_ followed by 40 characters.
 */
export function paystackSecret() {
  const key = process.env.PAYSTACK_SECRET_KEY?.trim();
  return key && /^sk_(test|live)_[A-Za-z0-9]{32,}$/.test(key) ? key : null;
}

export const paystackMode = () => (paystackSecret()?.startsWith("sk_live_") ? "live" : "test");

export const toPesewas = (cedis: number) => Math.round(cedis * 100);

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const secret = paystackSecret();
  if (!secret) throw new Error("Paystack is not configured");
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json", ...init.headers },
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  const body = (await res.json().catch(() => null)) as { status?: boolean; message?: string; data?: T } | null;
  if (!res.ok || !body?.status) throw new Error(`Paystack ${path}: ${body?.message ?? res.status}`);
  return body.data as T;
}

export function newReference(orderNumber: string) {
  return `${orderNumber}-${randomBytes(4).toString("hex")}`;
}

export function initializeTransaction(input: {
  email: string;
  amount: number; // cedis
  reference: string;
  callbackUrl: string;
  metadata: Record<string, unknown>;
}) {
  return call<{ authorization_url: string; access_code: string; reference: string }>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      amount: toPesewas(input.amount),
      currency: "GHS",
      reference: input.reference,
      callback_url: input.callbackUrl,
      channels: ["mobile_money", "card"],
      metadata: input.metadata,
    }),
  });
}

export type PaystackTransaction = {
  status: string; // success | failed | abandoned | ongoing | pending | reversed
  reference: string;
  amount: number; // pesewas
  currency: string;
  channel?: string; // card | mobile_money | …
  paid_at?: string | null;
  gateway_response?: string;
};

export function verifyTransaction(reference: string) {
  return call<PaystackTransaction>(`/transaction/verify/${encodeURIComponent(reference)}`);
}

/** Webhooks are signed with HMAC-SHA512 of the raw body using the secret key. */
export function isValidWebhookSignature(rawBody: string, signature: string | null) {
  const secret = paystackSecret();
  if (!secret || !signature) return false;
  const expected = Buffer.from(createHmac("sha512", secret).update(rawBody).digest("hex"));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/**
 * Each "Pay" press makes a new reference and we only keep the latest. If the
 * customer then pays in an older Paystack tab, that money is real (Paystack just
 * verified it) — so when it succeeded for the full order total and the order
 * isn't paid yet, point the order's payment at that reference instead of
 * dropping it as unknown.
 */
async function adoptEarlierAttempt<S extends Prisma.PaymentSelect>(tx: PaystackTransaction, select: S) {
  const orderNumber = tx.reference.match(/^(NTD-\d+)-[0-9a-f]{8}$/)?.[1];
  if (!orderNumber || tx.status !== "success" || tx.currency !== "GHS") return null;
  const order = await prisma.order.findUnique({ where: { orderNumber }, select: { id: true, total: true, paymentStatus: true } });
  if (!order || order.paymentStatus === "PAID" || tx.amount !== toPesewas(order.total.toNumber())) return null;
  const moved = await prisma.payment.updateMany({
    where: { orderId: order.id, status: { not: "SUCCESS" } },
    data: { reference: tx.reference, amount: order.total, status: "PENDING" },
  });
  if (moved.count === 0) return null;
  return prisma.payment.findUnique({ where: { reference: tx.reference }, select });
}

export type SettleResult =
  | { outcome: "paid" | "already-paid"; orderNumber: string; orderId: string }
  | { outcome: "failed" | "pending" | "mismatch"; orderNumber: string; orderId: string }
  | { outcome: "unknown-reference" };

/**
 * Apply a transaction Paystack has confirmed to our records. Safe to call any
 * number of times, from the callback and the webhook at once: only the first
 * successful call moves the order to CONFIRMED.
 */
export async function settleTransaction(tx: PaystackTransaction): Promise<SettleResult> {
  const select = { id: true, status: true, amount: true, order: { select: { id: true, orderNumber: true, status: true } } } as const;
  let payment = await prisma.payment.findUnique({ where: { reference: tx.reference }, select });
  if (!payment) payment = await adoptEarlierAttempt(tx, select);
  if (!payment) return { outcome: "unknown-reference" };
  const { order } = payment;
  const ref = { orderNumber: order.orderNumber, orderId: order.id };

  if (payment.status === "SUCCESS") return { outcome: "already-paid", ...ref };

  if (tx.status !== "success") {
    if (["failed", "abandoned", "reversed"].includes(tx.status)) {
      await prisma.payment.updateMany({ where: { id: payment.id, status: "PENDING" }, data: { status: "FAILED" } });
      return { outcome: "failed", ...ref };
    }
    return { outcome: "pending", ...ref };
  }

  // Never confirm an order for a different amount or currency than we asked for
  if (tx.amount !== toPesewas(payment.amount.toNumber()) || tx.currency !== "GHS") {
    console.error("Paystack amount/currency mismatch", { reference: tx.reference, got: [tx.amount, tx.currency], expected: toPesewas(payment.amount.toNumber()) });
    await prisma.orderStatusHistory.create({
      data: {
        orderId: order.id,
        status: order.status,
        note: `Internal: payment ${tx.reference} came back as ${tx.currency} ${tx.amount / 100} — expected GHS ${payment.amount.toNumber()}. Check it in Paystack before confirming.`,
      },
    });
    return { outcome: "mismatch", ...ref };
  }

  const method = tx.channel === "mobile_money" ? "MOMO" : tx.channel === "card" ? "CARD" : null;
  const won = await prisma.$transaction(async (db) => {
    // Only one caller (callback or webhook) gets to flip it
    const flipped = await db.payment.updateMany({
      where: { id: payment.id, status: { not: "SUCCESS" } },
      data: { status: "SUCCESS", paidAt: tx.paid_at ? new Date(tx.paid_at) : new Date(), method },
    });
    if (flipped.count === 0) return false;
    await db.order.update({
      where: { id: order.id },
      data: { paymentStatus: "PAID", ...(order.status === "PENDING" && { status: "CONFIRMED" }) },
    });
    await db.orderStatusHistory.create({
      data: {
        orderId: order.id,
        status: order.status === "PENDING" ? "CONFIRMED" : order.status,
        note:
          order.status === "PENDING"
            ? `Payment received${method === "MOMO" ? " by Mobile Money" : method === "CARD" ? " by card" : ""} — we're getting your order ready to source.`
            : `Internal: payment received while the order was ${order.status.toLowerCase()} — needs a look.`,
      },
    });
    return true;
  }, { timeout: 20_000, maxWait: 10_000 }); // same headroom as checkout: a slow moment mustn't drop a real payment
  return { outcome: won ? "paid" : "already-paid", ...ref };
}
