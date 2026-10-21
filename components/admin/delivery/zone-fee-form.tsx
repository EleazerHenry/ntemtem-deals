"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { updateDeliveryFee } from "@/app/admin/(panel)/delivery/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ZoneFeeForm({ zoneId, city, fee }: { zoneId: string; city: string; fee: number }) {
  const router = useRouter();
  const [value, setValue] = useState(String(fee));
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const changed = Number(value) !== fee;

  function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const r = await updateDeliveryFee(zoneId, value);
      if (r.ok) {
        toast.success(r.message);
        router.refresh();
      } else setError(r.error);
    });
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1">
        <label htmlFor={`fee-${zoneId}`} className="mb-1.5 block text-sm font-medium">
          Delivery fee for {city}
        </label>
        <div className="relative max-w-56">
          <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-sm text-muted-foreground">GH₵</span>
          <Input
            id={`fee-${zoneId}`}
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value.replace(/[^\d.]/g, ""))}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `fee-${zoneId}-error` : undefined}
            className="numeric h-11 pl-12 text-base"
          />
        </div>
        {error && (
          <p id={`fee-${zoneId}-error`} className="mt-1.5 text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
      <Button type="submit" className="h-11" disabled={pending || !changed || !value}>
        {pending && <Loader2 className="animate-spin" data-icon="inline-start" />}
        Save fee
      </Button>
    </form>
  );
}
