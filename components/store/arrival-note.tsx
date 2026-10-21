"use client";

import { Clock } from "lucide-react";
import { arrivalWindow } from "@/lib/delivery";
import { cn } from "@/lib/utils";

/**
 * The one delivery promise, worded the same everywhere:
 * "Arrives in Accra around 31 Oct – 2 Nov · 10–12 days after you pay".
 * Rendered in the browser, so the dates count from the shopper's today.
 */
export function ArrivalNote({ estimate: raw, pickupCity, className }: { estimate: string; pickupCity?: string; className?: string }) {
  const dates = arrivalWindow(raw);
  const estimate = raw.replace("-", "–"); // "10–12 days"
  return (
    <p className={cn("flex items-start gap-2.5 rounded-xl bg-brand-50 px-3.5 py-2.5 text-sm", className)}>
      <Clock className="mt-0.5 size-4 shrink-0 text-brand-700" />
      <span>
        {dates ? (
          <>
            {pickupCity ? `Ready to pick up in ${pickupCity} around ` : "Arrives in Accra around "}
            <strong className="font-semibold">{dates}</strong>
            <span className="text-muted-foreground"> · {estimate} after you pay</span>
          </>
        ) : (
          <>{pickupCity ? `Ready to pick up in ${estimate}` : `Arrives in Accra ${estimate} after you pay`}</>
        )}
      </span>
    </p>
  );
}
