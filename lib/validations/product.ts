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

export const PRICE_CHANGES = ["same", "more", "less"] as const;
export const MAX_VARIANTS = 30;

/** One option row, e.g. "Black · costs GH₵20 more". */
const variantRowSchema = z
  .object({
    key: z.string(), // client-side row key only
    id: z.string().optional(), // set for options that already exist
    name: z
      .string()
      .trim()
      .min(1, "Give this option a name, e.g. Black or Large.")
      .max(60, "Keep option names under 60 characters."),
    priceChange: z.enum(PRICE_CHANGES),
    amount: z.string(),
    isActive: z.boolean(),
    imageUrl: z.string(), // "" = no photo of its own
  })
  .transform((row, ctx) => {
    let priceAdjustment = 0;
    if (row.priceChange !== "same") {
      const value = parseMoney(row.amount);
      const fail = (message: string) => {
        ctx.addIssue({ code: "custom", path: ["amount"], message });
        return z.NEVER;
      };
      if (value === undefined) return fail("Use numbers only, like 20 or 9.50.");
      if (value === null || value === 0) {
        return fail(`Enter how much ${row.priceChange}, or choose “Same price”.`);
      }
      if (value > MAX_PRICE) return fail("That amount looks too high — check for an extra zero.");
      priceAdjustment = row.priceChange === "more" ? value : -value;
    }
    return { id: row.id, name: row.name, priceAdjustment, isActive: row.isActive, imageUrl: row.imageUrl || null };
  });

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
    hasVariants: z.boolean(),
    variants: z.array(variantRowSchema).max(MAX_VARIANTS, `A product can have up to ${MAX_VARIANTS} options.`),
  })
  .refine((p) => p.compareAtPrice === null || p.compareAtPrice > p.price, {
    path: ["compareAtPrice"],
    message: "The “was” price must be higher than the selling price, or customers won't see a saving.",
    // Run even when other fields have errors, as long as both prices parsed
    when: ({ value }) => {
      const v = value as { price?: unknown; compareAtPrice?: unknown };
      return typeof v.price === "number" && (v.compareAtPrice === null || typeof v.compareAtPrice === "number");
    },
  })
  .superRefine(
    (p, ctx) => {
      if (!p.hasVariants) return;
      if (p.variants.length < 2) {
        ctx.addIssue({
          code: "custom",
          path: ["variants"],
          message: "Add at least two options — or turn off options if there's only one version.",
        });
      } else if (!p.variants.some((v) => v.isActive)) {
        ctx.addIssue({
          code: "custom",
          path: ["variants"],
          message: "At least one option must be available. To stop selling it completely, hide the product instead.",
        });
      }
      const seen = new Set<string>();
      p.variants.forEach((v, i) => {
        const key = v.name.toLowerCase();
        if (seen.has(key)) {
          ctx.addIssue({ code: "custom", path: ["variants", i, "name"], message: `You already have an option called “${v.name}”.` });
        }
        seen.add(key);
        if (p.price + v.priceAdjustment <= 0) {
          ctx.addIssue({
            code: "custom",
            path: ["variants", i, "amount"],
            message: "This would make the option free or less — use a smaller amount.",
          });
        }
      });
    },
    {
      // Check the list even while other fields have errors, once price and rows parsed
      when: ({ value }) => {
        const v = value as { price?: unknown; variants?: unknown };
        return (
          typeof v.price === "number" &&
          Array.isArray(v.variants) &&
          v.variants.every((r) => typeof (r as { priceAdjustment?: unknown })?.priceAdjustment === "number")
        );
      },
    },
  );

/** What the form holds (all strings for money fields). */
export type ProductFormValues = z.input<typeof productFormSchema>;
export type VariantRow = ProductFormValues["variants"][number];
/** What gets saved, after parsing. */
export type ProductData = z.output<typeof productFormSchema>;
type VariantErrorKey = `variants.${number}.${"name" | "amount"}`;
export type ProductFieldErrors = Partial<Record<keyof ProductFormValues | VariantErrorKey, string>>;

/** Options switched off = nothing to check or save, even if half-typed rows remain in the form. */
export function normalizeProductInput(values: ProductFormValues): ProductFormValues {
  return values.hasVariants ? values : { ...values, variants: [] };
}

/** First message per field, keyed by path: "price", "variants", "variants.2.name". */
export function productFieldErrors(error: z.ZodError): ProductFieldErrors {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (key && !(key in errors)) errors[key] = issue.message;
  }
  return errors as ProductFieldErrors;
}

/** "Black" +20 on a GH₵245 base -> 265. Rounded to pesewas. */
export function variantPrice(basePrice: number, adjustment: number) {
  return Math.round((basePrice + adjustment) * 100) / 100;
}

export { categoryNameSchema } from "@/lib/validations/category";
