"use client";

import { useState } from "react";
import { CreditCard, Loader2, Lock, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Starts a Paystack payment and sends the customer to Paystack's secure page. */
export function PayButton({
  orderNumber,
  orderKey,
  enabled,
  whatsapp,
  retry,
}: {
  orderNumber: string;
  orderKey?: string;
  /** false when Paystack keys aren't set up yet */
  enabled: boolean;
  whatsapp: string | null;
  retry?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!enabled) {
    return (
      <div className="mt-6 space-y-3">
        <Button size="xl" className="w-full sm:w-auto" disabled>
          <CreditCard data-icon="inline-start" /> Proceed to payment
        </Button>
        <p className="text-sm text-paper/60">
          Online payment is being switched on — your order is saved and we&apos;ll contact you about paying.
        </p>
        {whatsapp && (
          <a href={whatsapp} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-400 hover:underline">
            <MessageCircle className="size-4" /> Pay via WhatsApp instead
          </a>
        )}
      </div>
    );
  }

  async function pay() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/payments/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber, key: orderKey }),
      });
      const data = await res.json();
      if (!res.ok || !data.authorizationUrl) throw new Error(data.error ?? "We couldn't start the payment. Please try again.");
      window.location.assign(data.authorizationUrl); // Paystack's secure checkout
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 space-y-3">
      <Button size="xl" className="w-full sm:w-auto" onClick={pay} disabled={busy}>
        {busy ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <CreditCard data-icon="inline-start" />}
        {busy ? "Opening secure payment…" : retry ? "Try paying again" : "Proceed to payment"}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-[#ffb4a8]">
          {error}
        </p>
      )}
      <p className="flex items-center gap-1.5 text-xs text-paper/50">
        <Lock className="size-3.5" /> You&apos;ll pay on Paystack&apos;s secure page, then come straight back here.
      </p>
    </div>
  );
}
