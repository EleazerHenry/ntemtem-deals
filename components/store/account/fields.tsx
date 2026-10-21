"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type FieldProps = {
  id: string;
  label: string;
  error?: string;
  hint?: React.ReactNode;
  optional?: boolean;
  aside?: React.ReactNode;
} & Omit<React.ComponentProps<"input">, "id">;

export function TextField({ id, label, error, hint, optional, aside, className, ...input }: FieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="flex items-baseline gap-2 text-sm font-medium">
          {label} {optional && <span className="text-xs font-normal text-muted-foreground">Optional</span>}
        </label>
        {aside}
      </div>
      <Input id={id} aria-invalid={error ? true : undefined} aria-describedby={`${id}-msg`} className="h-12 text-base" {...input} />
      {(error || hint) && (
        <p id={`${id}-msg`} className={cn("text-sm", error ? "text-destructive" : "text-muted-foreground")}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

export function PasswordField(props: Omit<FieldProps, "type">) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <TextField {...props} type={show ? "text" : "password"} className={cn("[&_input]:pr-12", props.className)} />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute top-[30px] right-0 grid h-12 w-12 place-items-center text-muted-foreground hover:text-foreground"
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
      </button>
    </div>
  );
}

export function FormAlert({ tone = "error", children }: { tone?: "error" | "success" | "info"; children: React.ReactNode }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-xl px-4 py-3 text-sm",
        tone === "error" && "bg-destructive/10 text-destructive",
        tone === "success" && "bg-success/10 text-success",
        tone === "info" && "bg-muted text-foreground",
      )}
    >
      {children}
    </p>
  );
}

/**
 * Only follow callbacks within the store — never off-site, never into the admin.
 * Resolved the way the browser will: "/\evil.com" and friends become another host.
 */
export function safeNext(url: string | null | undefined, fallback = "/account") {
  if (!url || !url.startsWith("/")) return fallback;
  const base = "https://store.invalid";
  let target: URL;
  try {
    target = new URL(url, base);
  } catch {
    return fallback;
  }
  if (target.origin !== base || target.pathname.startsWith("/admin") || target.pathname.startsWith("/account/login")) return fallback;
  return target.pathname + target.search + target.hash;
}
