import type { Metadata } from "next";
import { SignOutButton } from "@/components/store/account/account-actions";
import { AccountNav } from "@/components/store/account/account-nav";
import { requireCustomer } from "@/lib/account";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AccountAreaLayout({ children }: { children: React.ReactNode }) {
  // For the header only — every page also checks for itself
  const customer = await requireCustomer();
  const first = customer.name.split(/\s+/)[0];

  return (
    <div className="mx-auto max-w-5xl px-4 pt-8 pb-16 sm:px-8 sm:pt-12">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold sm:text-4xl">Hi, {first}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{customer.email}</p>
        </div>
        <SignOutButton />
      </header>
      <AccountNav />
      <div className="pt-8">{children}</div>
    </div>
  );
}
