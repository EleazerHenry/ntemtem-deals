"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { changePassword } from "@/app/admin/(panel)/settings/actions";
import { Field } from "@/components/admin/form-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  changePasswordErrors,
  changePasswordSchema,
  passwordStrength,
  type ChangePasswordErrors,
  type ChangePasswordValues,
} from "@/lib/validations/account";

const EMPTY: ChangePasswordValues = { currentPassword: "", newPassword: "", confirmPassword: "" };
const STRENGTH = [
  { label: "Too short", className: "bg-destructive", width: "w-1/4" },
  { label: "Okay", className: "bg-ghana-gold", width: "w-2/4" },
  { label: "Good", className: "bg-brand-500", width: "w-3/4" },
  { label: "Strong", className: "bg-success", width: "w-full" },
];

export function ChangePasswordForm() {
  const router = useRouter();
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState<ChangePasswordErrors>({});
  const [show, setShow] = useState(false);
  const [pending, startTransition] = useTransition();

  const set = (key: keyof ChangePasswordValues) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues((v) => ({ ...v, [key]: e.target.value }));
    setErrors((er) => ({ ...er, [key]: undefined }));
  };

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const check = changePasswordSchema.safeParse(values);
    if (!check.success) {
      setErrors(changePasswordErrors(check.error));
      return;
    }
    startTransition(async () => {
      const result = await changePassword(values);
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        if (result.formError) toast.error(result.formError);
        return;
      }
      setValues(EMPTY);
      setErrors({});
      toast.success("Password changed. Use your new password next time you sign in.");
      router.refresh();
    });
  }

  const strength = passwordStrength(values.newPassword);
  const inputProps = (key: keyof ChangePasswordValues, autoComplete: string) => ({
    id: `pw-${key}`,
    type: show ? "text" : "password",
    value: values[key],
    onChange: set(key),
    autoComplete,
    "aria-invalid": errors[key] ? true : undefined,
    className: "h-11 text-base sm:text-sm",
  });

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-md space-y-5">
      <Field id="pw-currentPassword" label="Current password" error={errors.currentPassword}>
        <Input {...inputProps("currentPassword", "current-password")} />
      </Field>
      <Field
        id="pw-newPassword"
        label="New password"
        error={errors.newPassword}
        hint="At least 10 characters. A short phrase like “jollof-on-sunday-42” is strong and easy to remember."
      >
        <Input {...inputProps("newPassword", "new-password")} />
        {values.newPassword && (
          <div className="flex items-center gap-3">
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <span className={cn("block h-full rounded-full transition-all", STRENGTH[strength].className, STRENGTH[strength].width)} />
            </span>
            <span className="w-16 text-right text-xs text-muted-foreground">{STRENGTH[strength].label}</span>
          </div>
        )}
      </Field>
      <Field id="pw-confirmPassword" label="Type the new password again" error={errors.confirmPassword}>
        <Input {...inputProps("confirmPassword", "new-password")} />
      </Field>
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />} {show ? "Hide passwords" : "Show passwords"}
      </button>
      <Button type="submit" size="lg" disabled={pending}>
        {pending && <Loader2 className="animate-spin" data-icon="inline-start" />}
        {pending ? "Changing…" : "Change password"}
      </Button>
    </form>
  );
}
