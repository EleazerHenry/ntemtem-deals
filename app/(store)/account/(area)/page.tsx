import type { Metadata } from "next";
import { MailCheck } from "lucide-react";
import { SignOutButton, VerifyEmailBanner } from "@/components/store/account/account-actions";
import { FormAlert } from "@/components/store/account/fields";
import { attachGuestOrders, requireCustomer } from "@/lib/account";
import { emailConfigured } from "@/lib/email";

export const metadata: Metadata = { title: "Your account" };

const WELCOME: Record<string, string> = {
  "check-email": "Welcome! We've sent you an email — tap the link in it to confirm your address.",
  "1": "Welcome to Ntemtem Deals! Your account is ready.",
  "password-changed": "Your new password is saved and you're signed in.",
};

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const customer = await requireCustomer("/account");
  const { welcome } = await searchParams;
  const first = customer.name.split(/\s+/)[0];
  // Email already proven: guest orders placed with it since then join the account too
  if (customer.emailVerified) await attachGuestOrders(customer.id, customer.email);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold sm:text-4xl">Hi, {first}</h1>
          <p className="mt-1 text-muted-foreground">{customer.email}</p>
        </div>
        <SignOutButton />
      </header>

      {welcome && WELCOME[welcome] && <FormAlert tone="success">{WELCOME[welcome]}</FormAlert>}

      {!customer.emailVerified && (
        <VerifyEmailBanner email={customer.email} canSend={emailConfigured() || process.env.EMAIL_LOG_LINKS === "1"} />
      )}
      {customer.emailVerified && (
        <p className="flex items-center gap-2 text-sm text-success">
          <MailCheck className="size-4" /> Email confirmed
        </p>
      )}
    </div>
  );
}
