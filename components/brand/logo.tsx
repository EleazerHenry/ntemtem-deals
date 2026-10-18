import { ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";

// Wordmark stand-in until the client's transparent PNG logo lands in public/.
export function Logo({ tone = "dark", className }: { tone?: "dark" | "light"; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-xl bg-brand-500 text-ink">
        <ShoppingCart className="size-5" strokeWidth={2.25} />
        <span className="ghana-stripe absolute inset-x-0 bottom-0 h-1" />
      </span>
      <span
        className={cn(
          "font-heading text-lg leading-none font-bold tracking-tight",
          tone === "light" ? "text-paper" : "text-ink",
        )}
      >
        Ntemtem <span className="text-brand-500">Deals</span>
      </span>
    </span>
  );
}
