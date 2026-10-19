import type { Metadata } from "next";
import bcrypt from "bcryptjs";
import { ShieldAlert } from "lucide-react";
import { FormSection } from "@/components/admin/form-section";
import { PageHeader } from "@/components/admin/page-header";
import { ChangePasswordForm } from "@/components/admin/settings/change-password-form";
import { requireAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { SEED_PASSWORD } from "@/lib/validations/account";

export const metadata: Metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  const admin = await requireAdmin();
  const user = await prisma.user.findUnique({ where: { id: admin.id }, select: { passwordHash: true } });
  const usingStarterPassword = !!user?.passwordHash && (await bcrypt.compare(SEED_PASSWORD, user.passwordHash));

  return (
    <>
      <PageHeader title="Settings" description="Your account and how you sign in. Store details will be added here later." />

      <div className="grid max-w-3xl gap-6">
        <FormSection title="Your account">
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Name</dt>
              <dd className="mt-0.5 font-medium">{admin.name}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Sign-in email</dt>
              <dd className="mt-0.5 font-medium break-all">{admin.email}</dd>
            </div>
          </dl>
        </FormSection>

        <FormSection title="Change password" description="You'll stay signed in on this device.">
          {usingStarterPassword && (
            <p className="flex gap-2.5 rounded-xl bg-warning/25 px-3.5 py-3 text-sm">
              <ShieldAlert className="mt-0.5 size-4 shrink-0" />
              You&apos;re still using the starter password from setup. Change it now so only you can get into your store.
            </p>
          )}
          <ChangePasswordForm />
        </FormSection>
      </div>
    </>
  );
}
