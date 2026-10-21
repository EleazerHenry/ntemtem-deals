"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { changeMyPassword, updateProfile } from "@/app/(store)/account/actions";
import { PasswordField, TextField } from "@/components/store/account/fields";
import { Button } from "@/components/ui/button";

export function ProfileForm({ name, phone }: { name: string; phone: string }) {
  const router = useRouter();
  const [values, setValues] = useState({ name, phone });
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [pending, startTransition] = useTransition();
  const dirty = values.name !== name || values.phone !== phone;

  return (
    <form
      noValidate
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const r = await updateProfile(values);
          if (!r.ok) {
            setErrors(r.fieldErrors ?? {});
            if (r.formError) toast.error(r.formError);
            return;
          }
          toast.success("Details saved");
          router.refresh();
        });
      }}
    >
      <TextField id="pf-name" label="Full name" value={values.name} onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))} error={errors.name} autoComplete="name" />
      <TextField id="pf-phone" label="Phone" optional type="tel" inputMode="tel" autoComplete="tel" value={values.phone} onChange={(e) => setValues((v) => ({ ...v, phone: e.target.value }))} error={errors.phone} placeholder="024 123 4567" />
      <Button type="submit" size="lg" disabled={pending || !dirty}>
        {pending && <Loader2 className="animate-spin" data-icon="inline-start" />}
        Save details
      </Button>
    </form>
  );
}

export function PasswordForm() {
  const empty = { current: "", password: "", confirm: "" };
  const [values, setValues] = useState(empty);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [pending, startTransition] = useTransition();
  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues((v) => ({ ...v, [k]: e.target.value }));
    setErrors((er) => ({ ...er, [k]: undefined }));
  };

  return (
    <form
      noValidate
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const r = await changeMyPassword(values);
          if (!r.ok) {
            setErrors(r.fieldErrors ?? {});
            if (r.formError) toast.error(r.formError);
            return;
          }
          setValues(empty);
          toast.success("Password changed");
        });
      }}
    >
      <PasswordField id="pw-current" label="Current password" autoComplete="current-password" value={values.current} onChange={set("current")} error={errors.current} />
      <PasswordField id="pw-password" label="New password" autoComplete="new-password" value={values.password} onChange={set("password")} error={errors.password} hint="At least 8 characters." />
      <PasswordField id="pw-confirm" label="Type it again" autoComplete="new-password" value={values.confirm} onChange={set("confirm")} error={errors.confirm} />
      <Button type="submit" size="lg" variant="secondary" disabled={pending}>
        {pending && <Loader2 className="animate-spin" data-icon="inline-start" />}
        Change password
      </Button>
    </form>
  );
}
