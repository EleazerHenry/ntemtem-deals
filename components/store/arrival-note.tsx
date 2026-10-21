"use client";

import { Clock } from "lucide-react";
import { arrivalWindow } from "@/lib/delivery";
import { cn } from "@/lib/utils";

/**
 * The one delivery promise, worded the same everywhere:
 * "Delivered in 10-12 days · arrives around 31 Oct – 2 Nov".
 * Rendered in the browser, so the dates count from the shopper's today.
 */
export function ArrivalNote({ estimate, pickupCity, className }: { estimate: string; pickupCity?: string; className?: string }) {
  const dates = arrivalWindow(estimate);
  return (
    <p className={cn("flex items-start gap-2.5 rounded-xl bg-brand-50 px-3.5 py-2.5 text-sm", className)}>
      <Clock className="mt-0.5 size-4 shrink-0 text-brand-700" />
      <span>
        {dates ? (
          <>
            {pickupCity ? `Ready to pick up in ${pickupCity} around ` : "Arrives around "}
            <strong className="font-semibold">{dates}</strong>
            <span className="text-muted-foreground"> · {estimate} after you pay</span>
          </>
        ) : (
          <>{pickupCity ? `Ready to pick up in ${estimate}` : `Delivered in ${estimate}`}</>
        )}
      </span>
    </p>
  );
}
