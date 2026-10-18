import { z } from "zod";
import { SLUG_PATTERN } from "@/lib/slug";

export const categoryNameSchema = z
  .string()
  .trim()
  .min(2, "Category names need at least 2 letters.")
  .max(60, "Keep category names under 60 characters.");

export const categoryFormSchema = z.object({
  name: categoryNameSchema,
  slug: z
    .string()
    .trim()
    .min(1, "The web address can't be empty.")
    .max(80, "Keep the web address under 80 characters.")
    .regex(SLUG_PATTERN, "Use only lowercase letters, numbers and dashes (e.g. home-gadgets)."),
  description: z.string().trim().max(300, "Keep the description under 300 characters — a sentence or two is plenty."),
  image: z.union([z.url(), z.literal("")]),
  isActive: z.boolean(),
});

export type CategoryFormValues = z.input<typeof categoryFormSchema>;
export type CategoryFieldErrors = Partial<Record<keyof CategoryFormValues, string>>;

export function categoryFieldErrors(error: z.ZodError): CategoryFieldErrors {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !(key in errors)) errors[key] = issue.message;
  }
  return errors as CategoryFieldErrors;
}
