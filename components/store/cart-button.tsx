"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

// Visual only for now — the cart is wired up in Phase 3.
export function CartButton() {
  return (
    <Sheet>
      <SheetTrigger
        className="relative grid size-11 place-items-center rounded-full transition-colors hover:bg-muted"
        aria-label="Open cart"
      >
        <ShoppingBag className="size-[22px]" />
      </SheetTrigger>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle className="font-heading text-xl">Your cart</SheetTitle>
          <SheetDescription className="sr-only">Items you&apos;ve added</SheetDescription>
        </SheetHeader>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <span className="grid size-16 place-items-center rounded-2xl bg-brand-50 text-brand-700">
            <ShoppingBag className="size-8" />
          </span>
          <div>
            <p className="font-heading text-xl font-semibold">Your cart is empty</p>
            <p className="mt-1 text-sm text-muted-foreground">Find something you love — we&apos;ll bring it to you.</p>
          </div>
          <SheetClose asChild>
            <Button asChild size="xl">
              <Link href="/shop">Start shopping</Link>
            </Button>
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  );
}
