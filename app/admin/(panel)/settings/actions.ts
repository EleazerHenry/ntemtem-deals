"use server";

import bcrypt from "bcryptjs";
import { requireAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { LIMITS, hit, waitLabel } from "@/lib/rate-limit";
import {
  changePasswordErrors,
  changePasswordSchema,
  type ChangePasswordErrors,
  type ChangePasswordValues,
} from "@/lib/validations/account";

export type ChangePasswordResult = { ok: true } | { ok: false; fieldErrors?: ChangePasswordErrors; formError?: string };

export async function changePassword(input: ChangePasswordValues): Promise<ChangePasswordResult> {
  const admin = await requireAdmin();

  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: changePasswordErrors(parsed.error) };
  const limit = await hit(`password-change:user:${admin.id}`, LIMITS.passwordChangePerUser);
  if (!limit.ok) return { ok: false, formError: `Too many attempts. Try again in ${waitLabel(limit.retryAfterSeconds)}.` };

  try {
    const user = await prisma.user.findUnique({ where: { id: admin.id }, select: { passwordHash: true } });
    const matches = !!user?.passwordHash && (await bcrypt.compare(parsed.data.currentPassword, user.passwordHash));
    if (!matches) return { ok: false, fieldErrors: { currentPassword: "That's not your current password." } };

    await prisma.user.update({
      where: { id: admin.id },
      data: { passwordHash: await bcrypt.hash(parsed.data.newPassword, 12) },
    });
    return { ok: true };
  } catch (error) {
    console.error("changePassword failed", error);
    return { ok: false, formError: "Couldn't change your password. Please try again." };
  }
}
