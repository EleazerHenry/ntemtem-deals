import { z } from "zod";
import { MAX_PHOTOS } from "@/lib/product-images";
import { SLUG_PATTERN } from "@/lib/slug";

export const MAX_PRICE = 1_000_000;

/** Parse what people actually type: "250", "1,250", "99.5", "GH₵ 250". */
export function parseMoney(raw: string): number | null | undefined {
  const cleaned = raw.trim().replace(/^(GH)?₵|^GHS/i, "").replace(/[,\s]/g, "");
  if (cleaned === "") return null;
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return undefined;
  return Number(cleaned);
}

type MoneyCtx = { addIssue: (issue: { code: "custom"; message: string }) => void };

/** Returns the amount, null for empty, or undefined after reporting an issue. */
function checkMoney(raw: string, ctx: MoneyCtx): number | null | undefined {
  const value = parseMoney(raw);
  if (value === undefined) {
    ctx.addIssue({ code: "custom", message: "Use numbers only, like 250 or 99.50." });
    return undefined;
  }
  if (value === null) return null;
  if (value <= 0) {
    ctx.addIssue({ code: "custom", message: "The price must be more than GH₵0." });
    return undefined;
  }
  if (value > MAX_PRICE) {
    ctx.addIssue({ code: "custom", message: "That price looks too high — check for an extra zero." });
    return undefined;
  }
  return value;
}

const requiredMoney = z.string().transform((raw, ctx): number => {
  const value = checkMoney(raw, ctx);
  if (value === null) ctx.addIssue({ code: "custom", message: "Enter the price customers will pay." });
  return value ?? z.NEVER;
});

const optionalMoney = z.string().transform((raw, ctx): number | null => {
  const value = checkMoney(raw, ctx);
  return value === undefined ? z.NEVER : value;
});

export const STOCK_TYPES = ["PREORDER", "IN_STOCK"] as const;

export const productFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Give your product a name.")
      .max(120, "Keep the name under 120 characters — shorter names read better."),
    slug: z
      .string()
      .trim()
      .min(1, "The web address can't be empty.")
      .max(100, "Keep the web address under 100 characters.")
      .regex(SLUG_PATTERN, "Use only lowercase letters, numbers and dashes (e.g. car-phone-holder)."),
    description: z
      .string()
      .trim()
      .min(10, "Add a short description — even one or two sentences helps customers decide.")
      .max(5000, "The description is too long — keep it under 5,000 characters."),
    categoryId: z.string().min(1, "Choose a category so customers can find this product."),
    price: requiredMoney,
    compareAtPrice: optionalMoney,
    stockType: z.enum(STOCK_TYPES),
    deliveryEstimate: z
      .string()
      .trim()
      .min(1, "Tell customers how long delivery takes, e.g. 10-12 days.")
      .max(40, "Keep the delivery time short, e.g. 10-12 days."),
    isActive: z.boolean(),
    isFeatured: z.boolean(),
    images: z.array(z.url()).max(MAX_PHOTOS, `A product can have up to ${MAX_PHOTOS} photos — remove a few.`),
  })
  .refine((p) => p.compareAtPrice === null || p.compareAtPrice > p.price, {
    path: ["compareAtPrice"],
    message: "The “was” price must be higher than the selling price, or customers won't see a saving.",
    // Run even when other fields have errors, as long as both prices parsed
    when: ({ value }) => {
      const v = value as { price?: unknown; compareAtPrice?: unknown };
      return typeof v.price === "number" && (v.compareAtPrice === null || typeof v.compareAtPrice === "number");
    },
  });

/** What the form holds (all strings for money fields). */
export type ProductFormValues = z.input<typeof productFormSchema>;
/** What gets saved, after parsing. */
export type ProductData = z.output<typeof productFormSchema>;
export type ProductFieldErrors = Partial<Record<keyof ProductFormValues, string>>;

export function productFieldErrors(error: z.ZodError): ProductFieldErrors {
  const fieldErrors = z.flattenError(error).fieldErrors as Record<string, string[] | undefined>;
  return Object.fromEntries(
    Object.entries(fieldErrors).map(([key, messages]) => [key, messages?.[0]]),
  ) as ProductFieldErrors;
}

export const categoryNameSchema = z
  .string()
  .trim()
  .min(2, "Category names need at least 2 letters.")
  .max(60, "Keep category names under 60 characters.");
