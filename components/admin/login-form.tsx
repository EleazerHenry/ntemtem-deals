"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SERVICE_UNAVAILABLE } from "@/lib/auth-errors";

// Only follow callbacks back into the admin — never off-site.
function safeCallback(url?: string) {
  if (!url || !url.startsWith("/admin") || url.startsWith("/admin/login")) return "/admin";
  return url;
}

export function LoginForm({ callbackUrl, notAdmin }: { callbackUrl?: string; notAdmin?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(
    notAdmin ? "That account doesn't have admin access. Sign in with the admin account." : "",
  );

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError("");

    startTransition(async () => {
      const result = await signIn("credentials", {
        email: form.get("email"),
        password: form.get("password"),
        redirect: false,
      });
      if (!result || result.error) {
        setError(
          result?.error === SERVICE_UNAVAILABLE
            ? "We couldn't reach the store right now. Check your internet connection and try again in a moment."
            : "That email and password don't match. Check for typos and try again.",
        );
        return;
      }
      router.replace(safeCallback(callbackUrl));
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          className="h-12 text-base"
          placeholder="you@ntemtemdeals.com"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            className="h-12 pr-12 text-base"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute inset-y-0 right-0 grid w-12 place-items-center text-muted-foreground hover:text-foreground"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" size="xl" className="w-full" disabled={pending}>
        {pending && <Loader2 className="animate-spin" data-icon="inline-start" />}
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
