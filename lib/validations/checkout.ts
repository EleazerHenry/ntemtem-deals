import { z } from "zod";

/** "024 123 4567", "0241234567", "+233 24 123 4567" -> "+233241234567"; null if not a Ghana mobile/landline. */
export function normalizeGhanaPhone(raw: string) {
  const digits = raw.replace(/[\s\-().]/g, "");
  const m = digits.match(/^(?:\+?233|0)([235]\d{8})$/);
  return m ? `+233${m[1]}` : null;
}

export const DELIVERY_METHODS = ["delivery", "pickup"] as const;

export const checkoutSchema = z
  .object({
    fullName: z.string().trim().min(2, "Enter the name of the person receiving the order.").max(80, "That name is too long."),
    phone: z
      .string()
      .trim()
      .transform((v, ctx) => {
        const phone = normalizeGhanaPhone(v);
        if (!phone) {
          ctx.addIssue({ code: "custom", message: "Enter a Ghana phone number, like 024 123 4567." });
          return z.NEVER;
        }
        return phone;
      }),
    email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email, like ama@gmail.com — we send your receipt there.")),
    city: z.string().min(1, "Choose your city."),
    method: z.enum(DELIVERY_METHODS),
    area: z.string().trim().max(80, "Keep the area short, e.g. East Legon."),
    landmark: z.string().trim().max(120, "Keep the landmark short."),
    couponCode: z.string().trim().toUpperCase().max(30),
    /** What the shopper saw — the server recomputes and refuses if it differs */
    expectedTotal: z.number().nonnegative(),
  })
  .superRefine(
    (v, ctx) => {
      if (v.method === "delivery" && v.area.trim().length < 2) {
        ctx.addIssue({ code: "custom", path: ["area"], message: "Enter your area or neighbourhood so the rider can find you." });
      }
    },
    // Report it together with any other mistakes, not only once they're fixed
    { when: ({ value }) => typeof (value as { area?: unknown })?.area === "string" },
  );

export type CheckoutInput = z.input<typeof checkoutSchema>;
export type CheckoutFieldErrors = Partial<Record<keyof CheckoutInput, string>>;

export function checkoutFieldErrors(error: z.ZodError): CheckoutFieldErrors {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !(key in errors)) errors[key] = issue.message;
  }
  return errors;
}

export const accountPasswordSchema = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(200, "That password is too long.");
