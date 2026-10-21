"use client";

import { useState, useTransition } from "react";
import { signOut } from "next-auth/react";
import { Loader2, LogOut, Mail } from "lucide-react";
import { resendVerification } from "@/app/(store)/account/actions";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  return (
    <Button variant="outline" onClick={() => signOut({ callbackUrl: "/" })}>
      <LogOut data-icon="inline-start" /> Sign out
    </Button>
  );
}

export function VerifyEmailBanner({ email, canSend }: { email: string; canSend: boolean }) {
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-ghana-gold bg-warning/15 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-3">
        <Mail className="mt-0.5 size-5 shrink-0" />
        <div className="text-sm">
          <p className="font-semibold">Confirm your email</p>
          <p className="text-muted-foreground">
            {canSend
              ? `Tap the link we sent to ${email}. Once confirmed, any orders you placed as a guest with it join your account.`
              : "Email confirmation is being switched on. Your account works — earlier guest orders will join it once you confirm."}
          </p>
          {message && <p className={message.ok ? "mt-1 font-medium text-success" : "mt-1 font-medium text-destructive"}>{message.text}</p>}
        </div>
      </div>
      {canSend && (
        <Button
          variant="secondary"
          className="shrink-0"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const r = await resendVerification();
              setMessage(r.ok ? { ok: true, text: r.message } : { ok: false, text: r.error });
            })
          }
        >
          {pending && <Loader2 className="animate-spin" data-icon="inline-start" />}
          Send a new link
        </Button>
      )}
    </section>
  );
}
