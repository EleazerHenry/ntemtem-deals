"use client";

import { useEffect, useTransition } from "react";
import { Loader2, RotateCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Shown when an admin page can't load — usually the connection to the database dropped. */
export function AdminError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const [retrying, startRetry] = useTransition();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-md rounded-2xl border bg-card px-6 py-14 text-center shadow-soft">
      <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
        <WifiOff className="size-7" />
      </span>
      <h1 className="mt-5 text-2xl font-semibold">This page didn&apos;t load</h1>
      <p className="mt-2 text-muted-foreground">
        We couldn&apos;t reach your store&apos;s data just now. This is usually a brief connection problem — your
        products and changes are safe.
      </p>
      <Button size="lg" className="mt-7" disabled={retrying} onClick={() => startRetry(() => retry())}>
        {retrying ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <RotateCw data-icon="inline-start" />}
        Try again
      </Button>
      {error.digest && <p className="mt-6 font-mono text-xs text-muted-foreground">Reference: {error.digest}</p>}
    </div>
  );
}
