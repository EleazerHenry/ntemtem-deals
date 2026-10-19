"use client";

import { Suspense } from "react";
import Form from "next/form";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

/** GET /shop?q=… — works without JavaScript; next/form makes it a client navigation. */
export function SearchBox({ className }: { className?: string }) {
  return (
    // The layout is static; only the input reads the URL, so it gets its own Suspense boundary
    <Suspense fallback={<SearchForm className={className} />}>
      <SearchFromUrl className={className} />
    </Suspense>
  );
}

function SearchFromUrl({ className }: { className?: string }) {
  const q = useSearchParams().get("q") ?? "";
  // key: reset the field when the search changes (e.g. a chip removed it)
  return <SearchForm key={q} className={className} defaultValue={q} />;
}

function SearchForm({ className, defaultValue = "" }: { className?: string; defaultValue?: string }) {
  return (
    <Form action="/shop" role="search" className={cn("relative", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-muted-foreground" />
      <input
        name="q"
        type="search"
        defaultValue={defaultValue}
        placeholder="Search for chargers, lamps, bags…"
        aria-label="Search products"
        enterKeyHint="search"
        className="h-11 w-full rounded-full border border-transparent bg-muted pr-4 pl-11 text-[0.95rem] outline-none transition-colors placeholder:text-muted-foreground hover:bg-muted/70 focus:border-brand-500 focus:bg-card focus:ring-3 focus:ring-ring/30"
      />
    </Form>
  );
}
