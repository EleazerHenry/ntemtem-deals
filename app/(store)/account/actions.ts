"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { attachGuestOrders, getCustomer, sendPasswordResetEmail, sendVerificationEmail } from "@/lib/account";
import { emailConfigured } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { LIMITS, clientIp, hit, waitLabel } from "@/lib/rate-limit";
import { passwordFingerprint, readToken } from "@/lib/tokens";
import { normalizeGhanaPhone } from "@/lib/validations/checkout";
import { emailSchema, fieldErrors, newPasswordSchema, registerSchema, type FieldErrors } from "@/lib/validations/customer";

const emailOn = () => emailConfigured() || process.env.EMAIL_LOG_LINKS === "1";

export type RegisterResult =
  | { ok: true; email: string; verificationSent: boolean }
  | { ok: false; fieldErrors?: FieldErrors<"name" | "email" | "phone" | "password">; formError?: string };

export async function registerCustomer(input: { name: string; email: string; phone: string; password: string }): Promise<RegisterResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };
  const { name, email, phone, password } = parsed.data;
  const limit = await hit(`register:ip:${await clientIp()}`, LIMITS.registerPerIp);
  if (!limit.ok) return { ok: false, formError: `Too many new accounts from this network. Try again in ${waitLabel(limit.retryAfterSeconds)}.` };

  try {
    const exists = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (exists) return { ok: false, fieldErrors: { email: "There's already an account with this email. Sign in instead." } };

    const user = await prisma.user.create({
      data: { name, email, phone, passwordHash: await bcrypt.hash(password, 12), role: "CUSTOMER" },
      select: { id: true, name: true, email: true },
    });
    const { sent } = await sendVerificationEmail(user);
    return { ok: true, email, verificationSent: sent };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, fieldErrors: { email: "There's already an account with this email. Sign in instead." } };
    }
    console.error("registerCustomer failed", error);
    return { ok: false, formError: "Couldn't create your account. Please try again." };
  }
}

export type SimpleResult = { ok: true; message: string } | { ok: false; error: string };

export async function resendVerification(): Promise<SimpleResult> {
  const customer = await getCustomer();
  if (!customer) return { ok: false, error: "Sign in first." };
  if (customer.emailVerified) return { ok: true, message: "Your email is already confirmed." };
  if (!emailOn()) return { ok: false, error: "We can't send emails just yet — please try again later." };
  const limit = await hit(`verify:user:${customer.id}`, LIMITS.verifyEmailPerUser);
  if (!limit.ok) return { ok: false, error: `We've sent a few links already. Check your inbox and spam, or try again in ${waitLabel(limit.retryAfterSeconds)}.` };
  const { sent } = await sendVerificationEmail(customer);
  return sent ? { ok: true, message: `New link sent to ${customer.email}.` } : { ok: false, error: "Couldn't send the email. Please try again in a minute." };
}

/** Always answers the same way, so this can't be used to find out who has an account. */
export async function requestPasswordReset(input: { email: string }): Promise<SimpleResult> {
  const parsed = emailSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  if (!emailOn()) return { ok: false, error: "Password reset by email isn't switched on yet. Contact us and we'll help you get back in." };
  const perIp = await hit(`reset:ip:${await clientIp()}`, LIMITS.resetPerIp);
  if (!perIp.ok) return { ok: false, error: `Too many reset requests. Try again in ${waitLabel(perIp.retryAfterSeconds)}.` };
  try {
    // Per inbox: quietly stop sending (the answer stays the same, so it reveals nothing)
    const perEmail = await hit(`reset:email:${parsed.data.email}`, LIMITS.resetPerEmail);
    const user = perEmail.ok
      ? await prisma.user.findUnique({ where: { email: parsed.data.email }, select: { id: true, name: true, email: true, passwordHash: true } })
      : null;
    if (user) await sendPasswordResetEmail(user);
  } catch (error) {
    console.error("requestPasswordReset failed", error);
  }
  return { ok: true, message: `If there's an account for ${parsed.data.email}, a reset link is on its way. Check your inbox (and spam).` };
}

export type ResetResult = { ok: true; email: string } | { ok: false; fieldErrors?: FieldErrors<"password" | "confirm">; formError?: string };

export async function resetPassword(token: string, input: { password: string; confirm: string }): Promise<ResetResult> {
  const parsed = newPasswordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };
  const check = readToken(token, "reset-password");
  if (!check.ok) {
    return { ok: false, formError: check.reason === "expired" ? "This link has expired. Ask for a new one." : "This link isn't valid. Ask for a new one." };
  }
  const user = await prisma.user.findUnique({ where: { id: check.userId }, select: { id: true, email: true, passwordHash: true } });
  // Used links die: the fingerprint no longer matches once the password changed
  if (!user || user.email !== check.email || passwordFingerprint(user.passwordHash) !== check.fingerprint) {
    return { ok: false, formError: "This link has already been used. Ask for a new one if you need to." };
  }
  await prisma.user.update({
    where: { id: user.id },
    // Clicking a link sent to the inbox also proves the email is theirs
    data: { passwordHash: await bcrypt.hash(parsed.data.password, 12), emailVerified: new Date() },
  });
  await attachGuestOrders(user.id, user.email);
  return { ok: true, email: user.email };
}

// ---- Addresses ----

const addressSchema = z.object({
  fullName: z.string().trim().min(2, "Enter the name of the person receiving orders.").max(80),
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
  city: z.string().min(1, "Choose your city."),
  area: z.string().trim().min(2, "Enter your area or neighbourhood.").max(80),
  landmark: z.string().trim().max(120),
  isDefault: z.boolean(),
});
export type AddressInput = z.input<typeof addressSchema>;
export type AddressResult = { ok: true } | { ok: false; fieldErrors?: FieldErrors<keyof AddressInput>; formError?: string };

export async function saveAddress(id: string | null, input: AddressInput): Promise<AddressResult> {
  const customer = await getCustomer();
  if (!customer) return { ok: false, formError: "Sign in again to save addresses." };
  const parsed = addressSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };
  const zone = await prisma.deliveryZone.findFirst({ where: { city: parsed.data.city, isActive: true }, select: { id: true } });
  if (!zone) return { ok: false, fieldErrors: { city: "We don't deliver to that city yet." } };

  const { isDefault, landmark, ...rest } = parsed.data;
  const count = await prisma.address.count({ where: { userId: customer.id } });
  const makeDefault = isDefault || count === 0;
  try {
    await prisma.$transaction(async (tx) => {
      if (makeDefault) await tx.address.updateMany({ where: { userId: customer.id }, data: { isDefault: false } });
      const data = { ...rest, landmark: landmark || null, isDefault: makeDefault };
      if (id) {
        // Only their own address can be edited
        const updated = await tx.address.updateMany({ where: { id, userId: customer.id }, data });
        if (updated.count === 0) throw new Error("not-found");
      } else {
        await tx.address.create({ data: { ...data, userId: customer.id } });
      }
    });
    revalidatePath("/account/addresses");
    return { ok: true };
  } catch (error) {
    if ((error as Error).message === "not-found") return { ok: false, formError: "That address no longer exists." };
    console.error("saveAddress failed", error);
    return { ok: false, formError: "Couldn't save the address. Please try again." };
  }
}

export async function deleteAddress(id: string): Promise<SimpleResult> {
  const customer = await getCustomer();
  if (!customer) return { ok: false, error: "Sign in again." };
  // Past orders keep their own copy of the delivery details
  const removed = await prisma.address.deleteMany({ where: { id, userId: customer.id } });
  if (removed.count === 0) return { ok: false, error: "That address no longer exists." };
  revalidatePath("/account/addresses");
  return { ok: true, message: "Address removed." };
}

export async function makeDefaultAddress(id: string): Promise<SimpleResult> {
  const customer = await getCustomer();
  if (!customer) return { ok: false, error: "Sign in again." };
  const owns = await prisma.address.count({ where: { id, userId: customer.id } });
  if (!owns) return { ok: false, error: "That address no longer exists." };
  await prisma.$transaction([
    prisma.address.updateMany({ where: { userId: customer.id }, data: { isDefault: false } }),
    prisma.address.update({ where: { id }, data: { isDefault: true } }),
  ]);
  revalidatePath("/account/addresses");
  return { ok: true, message: "Default address updated." };
}

// ---- Profile ----

const profileSchema = registerSchema.pick({ name: true, phone: true });
export type ProfileResult = { ok: true } | { ok: false; fieldErrors?: FieldErrors<"name" | "phone">; formError?: string };

export async function updateProfile(input: { name: string; phone: string }): Promise<ProfileResult> {
  const customer = await getCustomer();
  if (!customer) return { ok: false, formError: "Sign in again." };
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };
  await prisma.user.update({ where: { id: customer.id }, data: parsed.data });
  revalidatePath("/account", "layout");
  return { ok: true };
}

export type PasswordResult = { ok: true } | { ok: false; fieldErrors?: FieldErrors<"current" | "password" | "confirm">; formError?: string };

export async function changeMyPassword(input: { current: string; password: string; confirm: string }): Promise<PasswordResult> {
  const customer = await getCustomer();
  if (!customer) return { ok: false, formError: "Sign in again." };
  const parsed = newPasswordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };
  const limit = await hit(`password-change:user:${customer.id}`, LIMITS.passwordChangePerUser);
  if (!limit.ok) return { ok: false, formError: `Too many attempts. Try again in ${waitLabel(limit.retryAfterSeconds)}.` };
  const user = await prisma.user.findUnique({ where: { id: customer.id }, select: { passwordHash: true } });
  if (!user?.passwordHash || !(await bcrypt.compare(String(input.current), user.passwordHash))) {
    return { ok: false, fieldErrors: { current: "That's not your current password." } };
  }
  if (input.current === parsed.data.password) return { ok: false, fieldErrors: { password: "Choose a password different from your current one." } };
  await prisma.user.update({ where: { id: customer.id }, data: { passwordHash: await bcrypt.hash(parsed.data.password, 12) } });
  return { ok: true };
}
