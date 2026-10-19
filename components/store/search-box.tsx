import Form from "next/form";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

/** GET /shop?q=… — works without JavaScript; next/form makes it a client navigation. */
export function SearchBox({ className, autoFocus }: { className?: string; autoFocus?: boolean }) {
  return (
    <Form action="/shop" role="search" className={cn("relative", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-muted-foreground" />
      <input
        name="q"
        type="search"
        placeholder="Search for chargers, lamps, bags…"
        aria-label="Search products"
        autoFocus={autoFocus}
        enterKeyHint="search"
        className="h-11 w-full rounded-full border border-transparent bg-muted pr-4 pl-11 text-[0.95rem] outline-none transition-colors placeholder:text-muted-foreground hover:bg-muted/70 focus:border-brand-500 focus:bg-card focus:ring-3 focus:ring-ring/30"
      />
    </Form>
  );
}
