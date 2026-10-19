"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpDown, SlidersHorizontal } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

/** Native select: the friendliest picker on phones. Each option already knows its URL. */
export function SortSelect({ options, value }: { options: { value: string; label: string; href: string }[]; value: string }) {
  const router = useRouter();
  return (
    <label className="relative flex h-10 items-center gap-2 rounded-full border bg-card pr-3 pl-3.5 text-sm font-medium focus-within:ring-3 focus-within:ring-ring/30">
      <ArrowUpDown className="size-4 text-muted-foreground" />
      <span className="sr-only">Sort by</span>
      <select
        value={value}
        onChange={(e) => {
          const href = options.find((o) => o.value === e.target.value)?.href;
          if (href) router.push(href, { scroll: false });
        }}
        className="cursor-pointer appearance-none bg-transparent pr-1 outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Phone filters in a bottom sheet; closes itself once a filter is picked. */
export function FilterDrawer({ activeCount, children }: { activeCount: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="flex h-10 items-center gap-2 rounded-full border bg-card px-4 text-sm font-medium lg:hidden">
        <SlidersHorizontal className="size-4" /> Filters
        {activeCount > 0 && (
          <span className="numeric grid size-5 place-items-center rounded-full bg-ink text-[0.7rem] text-paper">{activeCount}</span>
        )}
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="max-h-[85dvh] gap-0 overflow-y-auto rounded-t-3xl p-0"
        // Don't focus the price box on open — it would pop the phone keyboard over the filters
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <SheetHeader className="sticky top-0 z-10 border-b bg-popover px-5 py-4">
          <SheetTitle className="font-heading text-xl">Filters</SheetTitle>
          <SheetDescription className="sr-only">Narrow down the products</SheetDescription>
        </SheetHeader>
        <div
          className="px-5 py-5"
          onClick={(e) => (e.target as HTMLElement).closest("a") && setOpen(false)}
          onSubmit={() => setOpen(false)}
        >
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}
