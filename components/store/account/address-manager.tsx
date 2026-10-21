"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MapPin, Plus } from "lucide-react";
import { toast } from "sonner";
import { deleteAddress, makeDefaultAddress, saveAddress, type AddressInput } from "@/app/(store)/account/actions";
import { FormAlert, TextField } from "@/components/store/account/fields";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatPhone } from "@/lib/format";
import { cn } from "@/lib/utils";

export type SavedAddress = { id: string; fullName: string; phone: string; city: string; area: string; landmark: string | null; isDefault: boolean };

export function AddressManager({ addresses, cities }: { addresses: SavedAddress[]; cities: string[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<SavedAddress | "new" | null>(null);
  const [busy, startBusy] = useTransition();

  const act = (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) =>
    startBusy(async () => {
      const r = await fn();
      if (r.ok) {
        toast.success(r.message);
        router.refresh();
      } else toast.error(r.error);
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Saved addresses</h2>
          <p className="text-sm text-muted-foreground">Your default address is filled in for you at checkout.</p>
        </div>
        <Button onClick={() => setEditing("new")}>
          <Plus data-icon="inline-start" /> Add address
        </Button>
      </div>

      {addresses.length === 0 ? (
        <div className="rounded-3xl border border-dashed bg-card px-6 py-12 text-center">
          <MapPin className="mx-auto size-8 text-brand-700" />
          <p className="mt-3 font-semibold">No saved addresses yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Add one now, or it&apos;s saved the first time you check out while signed in.</p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {addresses.map((a) => (
            <li key={a.id} className={cn("flex flex-col rounded-3xl border bg-card p-5 shadow-soft", a.isDefault && "border-ink")}>
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold">{a.fullName}</p>
                {a.isDefault && <span className="rounded-full bg-ink px-2.5 py-0.5 text-xs font-semibold text-paper">Default</span>}
              </div>
              <p className="text-sm text-muted-foreground">{formatPhone(a.phone)}</p>
              <p className="mt-2 text-sm">
                {a.area}, {a.city}
              </p>
              {a.landmark && <p className="text-sm text-muted-foreground">{a.landmark}</p>}
              <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
                <Button size="sm" variant="outline" onClick={() => setEditing(a)} disabled={busy}>
                  Edit
                </Button>
                {!a.isDefault && (
                  <Button size="sm" variant="ghost" onClick={() => act(() => makeDefaultAddress(a.id))} disabled={busy}>
                    Make default
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="ml-auto hover:text-destructive" onClick={() => act(() => deleteAddress(a.id))} disabled={busy}>
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Sheet open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <SheetContent side="right" className="w-full gap-0 p-0 data-[side=right]:w-full sm:max-w-md">
          {editing !== null && (
            <AddressForm
              key={editing === "new" ? "new" : editing.id}
              address={editing === "new" ? null : editing}
              cities={cities}
              isFirst={addresses.length === 0}
              onDone={() => {
                setEditing(null);
                router.refresh();
              }}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function AddressForm({ address, cities, isFirst, onDone }: { address: SavedAddress | null; cities: string[]; isFirst: boolean; onDone: () => void }) {
  const [values, setValues] = useState<AddressInput>({
    fullName: address?.fullName ?? "",
    phone: address?.phone ?? "",
    city: address?.city ?? "",
    area: address?.area ?? "",
    landmark: address?.landmark ?? "",
    isDefault: address?.isDefault ?? isFirst,
  });
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [formError, setFormError] = useState("");
  const [pending, startTransition] = useTransition();
  const set = (k: keyof AddressInput) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues((v) => ({ ...v, [k]: e.target.value }));
    setErrors((er) => ({ ...er, [k]: undefined }));
  };

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const r = await saveAddress(address?.id ?? null, values);
      if (!r.ok) {
        setErrors(r.fieldErrors ?? {});
        setFormError(r.formError ?? "");
        return;
      }
      toast.success(address ? "Address saved" : "Address added");
      onDone();
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex h-full flex-col">
      <SheetHeader className="border-b px-5 py-4">
        <SheetTitle className="font-heading text-xl">{address ? "Edit address" : "Add an address"}</SheetTitle>
        <SheetDescription>Where should we deliver?</SheetDescription>
      </SheetHeader>
      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
        <TextField id="ad-fullName" label="Full name" value={values.fullName} onChange={set("fullName")} error={errors.fullName} autoComplete="name" />
        <TextField id="ad-phone" label="Phone" type="tel" inputMode="tel" autoComplete="tel" value={values.phone} onChange={set("phone")} error={errors.phone} placeholder="024 123 4567" />
        <fieldset>
          <legend className="mb-2 text-sm font-medium">City</legend>
          <div role="radiogroup" aria-label="City" className="grid grid-cols-2 gap-2">
            {cities.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={values.city === c}
                onClick={() => {
                  setValues((v) => ({ ...v, city: c }));
                  setErrors((er) => ({ ...er, city: undefined }));
                }}
                className={cn("h-11 rounded-xl border text-sm font-medium", values.city === c ? "border-ink bg-ink text-paper" : "bg-card hover:border-foreground/30")}
              >
                {c}
              </button>
            ))}
          </div>
          {errors.city && <p className="mt-1.5 text-sm text-destructive">{errors.city}</p>}
        </fieldset>
        <TextField id="ad-area" label="Area or neighbourhood" value={values.area} onChange={set("area")} error={errors.area} placeholder="e.g. East Legon" />
        <TextField id="ad-landmark" label="Landmark" optional value={values.landmark} onChange={set("landmark")} error={errors.landmark} placeholder="e.g. near the blue kiosk" />
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" checked={values.isDefault} onChange={(e) => setValues((v) => ({ ...v, isDefault: e.target.checked }))} className="size-5 accent-[var(--color-ink)]" />
          Use as my default address
        </label>
        {formError && <FormAlert>{formError}</FormAlert>}
      </div>
      <SheetFooter className="flex-row justify-end gap-2 border-t px-5 py-4">
        <Button type="button" variant="outline" size="lg" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" size="lg" disabled={pending}>
          {pending && <Loader2 className="animate-spin" data-icon="inline-start" />}
          Save address
        </Button>
      </SheetFooter>
    </form>
  );
}
