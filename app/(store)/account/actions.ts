"use server";

import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { attachGuestOrders, getCustomer, sendPasswordResetEmail, sendVerificationEmail } from "@/lib/account";
import { emailConfigured } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { passwordFingerprint, readToken } from "@/lib/tokens";
import { emailSchema, fieldErrors, newPasswordSchema, registerSchema, type FieldErrors } from "@/lib/validations/customer";

const emailOn = () => emailConfigured() || process.env.EMAIL_LOG_LINKS === "1";

export type RegisterResult =
  | { ok: true; email: string; verificationSent: boolean }
  | { ok: false; fieldErrors?: FieldErrors<"name" | "email" | "phone" | "password">; formError?: string };

export async function registerCustomer(input: { name: string; email: string; phone: string; password: string }): Promise<RegisterResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };
  const { name, email, phone, password } = parsed.data;

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
  const { sent } = await sendVerificationEmail(customer);
  return sent ? { ok: true, message: `New link sent to ${customer.email}.` } : { ok: false, error: "Couldn't send the email. Please try again in a minute." };
}

/** Always answers the same way, so this can't be used to find out who has an account. */
export async function requestPasswordReset(input: { email: string }): Promise<SimpleResult> {
  const parsed = emailSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  if (!emailOn()) return { ok: false, error: "Password reset by email isn't switched on yet. Contact us and we'll help you get back in." };
  try {
    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      select: { id: true, name: true, email: true, passwordHash: true },
    });
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
