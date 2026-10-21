import type { Metadata } from "next";
import { CircleAlert, MailCheck } from "lucide-react";
import { ProfileForm, PasswordForm } from "@/components/store/account/profile-forms";
import { requireCustomer } from "@/lib/account";
import { formatPhone } from "@/lib/format";

export const metadata: Metadata = { title: "Your profile" };

export default async function ProfilePage() {
  const customer = await requireCustomer("/account/profile");
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-3xl border bg-card p-6 shadow-soft sm:p-8">
        <h2 className="text-xl font-semibold">Your details</h2>
        <p className="mt-1 mb-6 flex items-center gap-1.5 text-sm text-muted-foreground">
          {customer.email}
          {customer.emailVerified ? (
            <span className="inline-flex items-center gap-1 text-success">
              <MailCheck className="size-4" /> confirmed
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-brand-800">
              <CircleAlert className="size-4" /> not confirmed yet
            </span>
          )}
        </p>
        <ProfileForm name={customer.name} phone={formatPhone(customer.phone)} />
      </section>
      <section className="rounded-3xl border bg-card p-6 shadow-soft sm:p-8">
        <h2 className="mb-6 text-xl font-semibold">Password</h2>
        <PasswordForm />
      </section>
    </div>
  );
}
