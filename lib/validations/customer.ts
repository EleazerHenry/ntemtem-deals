import { z } from "zod";
import { normalizeGhanaPhone } from "@/lib/validations/checkout";

const email = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email, like ama@gmail.com."));
const password = z.string().min(8, "Use at least 8 characters.").max(200, "That password is too long.");

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(80, "That name is too long."),
  email,
  phone: z
    .string()
    .trim()
    .transform((v, ctx) => {
      if (!v) return null;
      const phone = normalizeGhanaPhone(v);
      if (!phone) {
        ctx.addIssue({ code: "custom", message: "Enter a Ghana phone number, like 024 123 4567 — or leave it empty." });
        return z.NEVER;
      }
      return phone;
    }),
  password,
});

export const emailSchema = z.object({ email });
export const newPasswordSchema = z
  .object({ password, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "The two passwords don't match." });

export type FieldErrors<T extends string> = Partial<Record<T, string>>;

export function fieldErrors<T extends string>(error: z.ZodError): FieldErrors<T> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !(key in out)) out[key] = issue.message;
  }
  return out as FieldErrors<T>;
}
