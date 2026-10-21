"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { registerCustomer, requestPasswordReset, resetPassword } from "@/app/(store)/account/actions";
import { FormAlert, PasswordField, TextField, safeNext } from "@/components/store/account/fields";
import { useCart } from "@/components/store/cart/cart-provider";
import { Button } from "@/components/ui/button";
import { RATE_LIMITED, SERVICE_UNAVAILABLE } from "@/lib/auth-errors";

function Submit({ pending, children, pendingLabel }: { pending: boolean; children: React.ReactNode; pendingLabel: string }) {
  return (
    <Button type="submit" size="xl" className="h-12 w-full" disabled={pending}>
      {pending && <Loader2 className="animate-spin" data-icon="inline-start" />}
      {pending ? pendingLabel : children}
    </Button>
  );
}

export function LoginForm({ next, notice }: { next?: string; notice?: string }) {
  const router = useRouter();
  const { refresh } = useCart();
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setError("");
    startTransition(async () => {
      const result = await signIn("credentials", { email: form.get("email"), password: form.get("password"), redirect: false });
      if (!result || result.error) {
        setError(
          result?.error === SERVICE_UNAVAILABLE
            ? "We couldn't reach the store right now. Check your connection and try again."
            : result?.error === RATE_LIMITED
              ? "Too many sign-in attempts. Wait 15 minutes and try again, or reset your password."
              : "That email and password don't match. Check for typos, or reset your password.",
        );
        return;
      }
      refresh(); // brings a guest cart into the account
      router.replace(safeNext(next));
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {notice && <FormAlert tone="success">{notice}</FormAlert>}
      <TextField id="email" name="email" label="Email" type="email" inputMode="email" autoComplete="email" required placeholder="you@gmail.com" />
      <PasswordField
        id="password"
        name="password"
        label="Password"
        autoComplete="current-password"
        required
        aside={
          <Link href="/account/forgot" className="text-sm font-medium text-brand-700 hover:underline">
            Forgot password?
          </Link>
        }
      />
      {error && <FormAlert>{error}</FormAlert>}
      <Submit pending={pending} pendingLabel="Signing in…">
        Sign in
      </Submit>
      <p className="text-center text-sm text-muted-foreground">
        New to Ntemtem Deals?{" "}
        <Link href={`/account/register${next ? `?callbackUrl=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-foreground hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}

export function RegisterForm({ next }: { next?: string }) {
  const router = useRouter();
  const { refresh } = useCart();
  const [values, setValues] = useState({ name: "", email: "", phone: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [formError, setFormError] = useState("");
  const [pending, startTransition] = useTransition();
  const set = (k: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues((v) => ({ ...v, [k]: e.target.value }));
    setErrors((er) => ({ ...er, [k]: undefined }));
  };

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    startTransition(async () => {
      const result = await registerCustomer(values);
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setFormError(result.formError ?? "");
        return;
      }
      await signIn("credentials", { email: result.email, password: values.password, redirect: false });
      refresh();
      const dest = safeNext(next);
      router.replace(`${dest}${dest.includes("?") ? "&" : "?"}welcome=${result.verificationSent ? "check-email" : "1"}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <TextField id="name" label="Full name" value={values.name} onChange={set("name")} error={errors.name} autoComplete="name" />
      <TextField id="email" label="Email" type="email" inputMode="email" autoComplete="email" value={values.email} onChange={set("email")} error={errors.email} placeholder="you@gmail.com" hint="We'll send a link to confirm it's yours." />
      <TextField id="phone" label="Phone" optional type="tel" inputMode="tel" autoComplete="tel" value={values.phone} onChange={set("phone")} error={errors.phone} placeholder="024 123 4567" hint="Saves typing it at checkout." />
      <PasswordField id="password" label="Password" autoComplete="new-password" value={values.password} onChange={set("password")} error={errors.password} hint="At least 8 characters." />
      {formError && <FormAlert>{formError}</FormAlert>}
      <Submit pending={pending} pendingLabel="Creating your account…">
        Create account
      </Submit>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/account/login" className="font-semibold text-foreground hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}

export function ForgotForm() {
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const r = await requestPasswordReset({ email });
      setResult(r.ok ? { tone: "success", text: r.message } : { tone: "error", text: r.error });
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <TextField id="email" label="Email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@gmail.com" />
      {result && <FormAlert tone={result.tone}>{result.text}</FormAlert>}
      <Submit pending={pending} pendingLabel="Sending…">
        Send reset link
      </Submit>
      <p className="text-center text-sm text-muted-foreground">
        Remembered it?{" "}
        <Link href="/account/login" className="font-semibold text-foreground hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const router = useRouter();
  const [values, setValues] = useState({ password: "", confirm: "" });
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [formError, setFormError] = useState("");
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    startTransition(async () => {
      const r = await resetPassword(token, values);
      if (!r.ok) {
        setErrors(r.fieldErrors ?? {});
        setFormError(r.formError ?? "");
        return;
      }
      await signIn("credentials", { email: r.email, password: values.password, redirect: false });
      router.replace("/account?welcome=password-changed");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <PasswordField id="password" label="New password" autoComplete="new-password" value={values.password} onChange={(e) => setValues((v) => ({ ...v, password: e.target.value }))} error={errors.password} hint="At least 8 characters." />
      <PasswordField id="confirm" label="Type it again" autoComplete="new-password" value={values.confirm} onChange={(e) => setValues((v) => ({ ...v, confirm: e.target.value }))} error={errors.confirm} />
      {formError && (
        <FormAlert>
          {formError}{" "}
          <Link href="/account/forgot" className="font-semibold underline">
            Get a new link
          </Link>
        </FormAlert>
      )}
      <Submit pending={pending} pendingLabel="Saving…">
        Save new password
      </Submit>
    </form>
  );
}
