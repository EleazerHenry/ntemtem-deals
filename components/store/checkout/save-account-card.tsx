"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Eye, EyeOff, Loader2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { createAccountForOrder } from "@/app/(store)/checkout/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Optional, after ordering: one password field and the order is saved to an account. */
export function SaveAccountCard({
  orderId,
  orderKey,
  email,
  accountExists,
}: {
  orderId: string;
  orderKey: string;
  email: string;
  accountExists: boolean;
}) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  if (accountExists) {
    return (
      <section className="rounded-3xl border bg-card p-6 text-sm">
        <p className="font-semibold">You already have an account with {email}</p>
        <p className="mt-1 text-muted-foreground">Keep this page&apos;s link to check your order. Signing in to see all your orders arrives soon.</p>
      </section>
    );
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await createAccountForOrder(orderId, orderKey, password);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      await signIn("credentials", { email: result.email, password, redirect: false });
      toast.success("Account created — your order is saved to it.");
      router.refresh();
    });
  }

  return (
    <section className="rounded-3xl border bg-card p-6 sm:p-8">
      <div className="flex gap-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-700">
          <UserRound className="size-5" />
        </span>
        <div>
          <h2 className="text-xl font-semibold">Save your details for next time</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Optional. Add a password to track this order and check out faster later. Your email: <strong>{email}</strong>
          </p>
        </div>
      </div>
      <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-3 sm:flex-row" noValidate>
        <div className="relative flex-1">
          <Input
            type={show ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Choose a password (8+ characters)"
            autoComplete="new-password"
            aria-label="Choose a password"
            aria-invalid={error ? true : undefined}
            className="h-12 pr-12 text-base"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute inset-y-0 right-0 grid w-12 place-items-center text-muted-foreground"
            aria-label={show ? "Hide password" : "Show password"}
          >
            {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
          </button>
        </div>
        <Button type="submit" size="xl" className="h-12" disabled={pending || password.length === 0}>
          {pending && <Loader2 className="animate-spin" data-icon="inline-start" />}
          Create account
        </Button>
      </form>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </section>
  );
}
