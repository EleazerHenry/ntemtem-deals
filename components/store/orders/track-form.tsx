"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import { lookupOrder } from "@/app/(store)/track/actions";
import { FormAlert, TextField } from "@/components/store/account/fields";
import { Button } from "@/components/ui/button";

export function TrackForm() {
  const router = useRouter();
  const [values, setValues] = useState({ orderNumber: "", email: "" });
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <form
      noValidate
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        setError("");
        startTransition(async () => {
          const r = await lookupOrder(values);
          if (r.ok) router.push(r.redirectTo);
          else setError(r.error);
        });
      }}
    >
      <TextField
        id="tr-number"
        label="Order number"
        value={values.orderNumber}
        onChange={(e) => setValues((v) => ({ ...v, orderNumber: e.target.value.toUpperCase() }))}
        placeholder="NTD-0012"
        autoCapitalize="characters"
        autoComplete="off"
      />
      <TextField
        id="tr-email"
        label="Email"
        type="email"
        inputMode="email"
        autoComplete="email"
        value={values.email}
        onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
        placeholder="you@gmail.com"
      />
      {error && <FormAlert>{error}</FormAlert>}
      <Button type="submit" size="xl" className="h-12 w-full" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <Search data-icon="inline-start" />}
        Track order
      </Button>
    </form>
  );
}
