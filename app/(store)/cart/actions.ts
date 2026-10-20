"use server";

import { z } from "zod";
import { MAX_QTY, addItem, type AddResult } from "@/lib/cart";

const id = z.string().min(1).max(64);
const addSchema = z.object({
  productId: id,
  variantId: id.nullable(),
  quantity: z.number().int().min(1).max(MAX_QTY),
});

export async function addToCart(input: z.input<typeof addSchema>): Promise<AddResult> {
  const parsed = addSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Something went wrong — please refresh and try again." };
  try {
    return await addItem(parsed.data.productId, parsed.data.variantId, parsed.data.quantity);
  } catch (error) {
    console.error("addToCart failed", error);
    return { ok: false, error: "Couldn't add that to your cart. Please try again." };
  }
}
