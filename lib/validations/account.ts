import { z } from "zod";

/** Passwords nobody should keep — including the seed default. */
const WEAK = ["admin@1234", "password", "password1", "password123", "12345678", "123456789", "1234567890", "ntemtem", "ntemtemdeals"];

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: z
      .string()
      .min(10, "Use at least 10 characters — a short phrase is easiest to remember.")
      .max(200, "That password is too long.")
      .refine((p) => !WEAK.includes(p.toLowerCase()), "That password is too easy to guess. Try a short phrase."),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "The two new passwords don't match.",
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    path: ["newPassword"],
    message: "Choose a password different from your current one.",
  });

export type ChangePasswordValues = z.input<typeof changePasswordSchema>;
export type ChangePasswordErrors = Partial<Record<keyof ChangePasswordValues, string>>;

export function changePasswordErrors(error: z.ZodError): ChangePasswordErrors {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !(key in errors)) errors[key] = issue.message;
  }
  return errors;
}

/** Rough strength for the meter: 0 (weak) – 3 (strong). */
export function passwordStrength(p: string): 0 | 1 | 2 | 3 {
  if (p.length < 10) return 0;
  const variety = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(p)).length;
  if (p.length >= 16 || (p.length >= 12 && variety >= 3)) return 3;
  if (variety >= 2) return 2;
  return 1;
}

export const SEED_PASSWORD = "Admin@1234";
