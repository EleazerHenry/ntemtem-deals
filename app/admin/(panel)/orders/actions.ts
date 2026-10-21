"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/dal";
import { ADMIN_STEP, INTERNAL_NOTE_PREFIX, nextStatus, type OrderStatusValue } from "@/lib/order-status";
import { prisma } from "@/lib/prisma";

export type OrderActionResult = { ok: true; message: string } | { ok: false; error: string };

const note = z.string().trim().max(500, "Keep the note under 500 characters.");

function refresh(orderNumber: string) {
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderNumber}`);
  revalidatePath("/admin");
}

/**
 * Move an order to its next step and write the history entry the customer sees.
 * `from` is the status the owner was looking at — if it moved meanwhile
 * (double tap, second tab), nothing happens.
 */
export async function advanceOrder(orderId: string, from: OrderStatusValue, rawNote: string): Promise<OrderActionResult> {
  await requireAdmin();
  const parsed = note.safeParse(rawNote);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const to = nextStatus(from);
  if (!to) return { ok: false, error: "This order can't move any further." };

  try {
    const order = await prisma.$transaction(async (tx) => {
      const moved = await tx.order.updateMany({
        where: { id: orderId, status: from },
        data: { status: to, ...(to === "CONFIRMED" && { paymentStatus: "PAID" }) },
      });
      if (moved.count === 0) return null;
      await tx.orderStatusHistory.create({
        data: { orderId, status: to, note: parsed.data || ADMIN_STEP[from].defaultNote || null },
      });
      return tx.order.findUnique({ where: { id: orderId }, select: { orderNumber: true } });
    });
    if (!order) return { ok: false, error: "This order was already updated — refresh to see its latest status." };
    refresh(order.orderNumber);
    return { ok: true, message: `Order moved to “${ADMIN_STEP[to].label}”. The customer can see it now.` };
  } catch (error) {
    console.error("advanceOrder failed", error);
    return { ok: false, error: "Couldn't update the order. Please try again." };
  }
}

/** A note without changing the status, e.g. "Delayed at customs — 2 more days". */
export async function addOrderNote(orderId: string, rawNote: string, internal: boolean): Promise<OrderActionResult> {
  await requireAdmin();
  const parsed = note.min(2, "Write the update first.").safeParse(rawNote);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { status: true, orderNumber: true } });
  if (!order) return { ok: false, error: "That order no longer exists." };
  await prisma.orderStatusHistory.create({
    data: { orderId, status: order.status, note: internal ? `${INTERNAL_NOTE_PREFIX} ${parsed.data}` : parsed.data },
  });
  refresh(order.orderNumber);
  return { ok: true, message: internal ? "Private note saved." : "Update posted — the customer can see it now." };
}

export async function cancelOrder(orderId: string, rawReason: string): Promise<OrderActionResult> {
  await requireAdmin();
  const parsed = note.min(3, "Say why it's cancelled — the customer will see this.").safeParse(rawReason);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { status: true, orderNumber: true } });
  if (!order) return { ok: false, error: "That order no longer exists." };
  if (order.status === "DELIVERED" || order.status === "CANCELLED") return { ok: false, error: "This order can't be cancelled now." };
  const moved = await prisma.order.updateMany({ where: { id: orderId, status: order.status }, data: { status: "CANCELLED" } });
  if (moved.count === 0) return { ok: false, error: "This order was just updated — refresh and try again." };
  await prisma.orderStatusHistory.create({ data: { orderId, status: "CANCELLED", note: parsed.data } });
  refresh(order.orderNumber);
  return { ok: true, message: "Order cancelled." };
}
