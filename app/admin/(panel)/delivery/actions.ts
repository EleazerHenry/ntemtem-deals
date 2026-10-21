"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

export type DeliveryFeeResult = { ok: true; message: string } | { ok: false; error: string };

const fee = z.coerce
  .number({ error: "Enter the fee in cedis, e.g. 30." })
  .min(0, "The fee can't be negative.")
  .max(1000, "That fee looks too high — check it.")
  .transform((n) => Math.round(n * 100) / 100);

/** Change a city's delivery fee. New orders use it straight away; placed orders keep theirs. */
export async function updateDeliveryFee(zoneId: string, rawFee: string): Promise<DeliveryFeeResult> {
  await requireAdmin();
  const parsed = fee.safeParse(rawFee);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const updated = await prisma.deliveryZone.updateMany({ where: { id: String(zoneId) }, data: { deliveryFee: parsed.data } });
  if (updated.count === 0) return { ok: false, error: "That city no longer exists — reload the page." };
  revalidatePath("/admin/delivery");
  revalidatePath("/", "layout"); // checkout, FAQ and Delivery page show the fee
  return { ok: true, message: `Saved. New orders pay GH₵${parsed.data.toLocaleString("en-GH")} for delivery.` };
}
