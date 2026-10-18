import type { Metadata } from "next";
import { Logo } from "@/components/brand/logo";
import { LoginForm } from "@/components/admin/login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const { callbackUrl, error } = await searchParams;

  return (
    <main className="grid flex-1 lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-ink p-12 text-paper lg:flex lg:flex-col">
        <div className="ghana-stripe absolute inset-x-0 top-0 h-1" />
        <div
          aria-hidden
          className="absolute -right-40 -bottom-40 size-[36rem] rounded-full bg-brand-500/25 blur-3xl"
        />
        <Logo tone="light" />
        <div className="relative mt-auto max-w-md space-y-5">
          <h2 className="text-5xl leading-[1.05] font-bold">
            Your store, <span className="text-brand-400">in your pocket.</span>
          </h2>
          <p className="text-lg text-paper/70">
            Add products, follow orders and set delivery fees — from your phone or your laptop.
          </p>
        </div>
        <p className="eyebrow relative mt-16 text-paper/50">Fast Deals • Quality Products • To Ghana</p>
      </aside>

      <section className="flex flex-col px-4 py-10 sm:px-8">
        <div className="ghana-stripe -mx-4 -mt-10 mb-10 h-1 sm:-mx-8 lg:hidden" />
        <Logo className="lg:hidden" />
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          <div className="mb-8 space-y-2">
            <h1 className="text-3xl font-bold">Welcome back</h1>
            <p className="text-muted-foreground">Sign in to manage Ntemtem Deals.</p>
          </div>
          <LoginForm callbackUrl={callbackUrl} notAdmin={error === "not-admin"} />
        </div>
      </section>
    </main>
  );
}
