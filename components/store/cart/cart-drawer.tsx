"use client";

import Link from "next/link";
import { ArrowRight, ImageIcon, Lock, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { ArrivalNote } from "@/components/store/arrival-note";
import { useCart } from "@/components/store/cart/cart-provider";
import { PaymentMarks } from "@/components/store/payment-marks";
import { ProductImage } from "@/components/store/product-image";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { formatPrice } from "@/lib/format";
import type { CartLine } from "@/lib/cart";
import { cn } from "@/lib/utils";

const MAX_QTY = 10;

export function CartDrawer() {
  const { cart, open, setOpen, justAdded, setQuantity, remove } = useCart();
  const count = cart?.count ?? 0;
  const hasLines = !!cart?.lines.length;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className="relative grid size-11 place-items-center rounded-full transition-colors hover:bg-muted"
        aria-label={count ? `Open cart, ${count} ${count === 1 ? "item" : "items"}` : "Open cart"}
      >
        <ShoppingBag className="size-[22px]" />
        {count > 0 && (
          <span className="numeric absolute -top-0.5 -right-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-brand-500 px-1 text-[0.7rem] font-bold text-ink ring-2 ring-background">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </SheetTrigger>

      {/* Full width on phones (the sheet default is 75%) so every row has room */}
      <SheetContent side="right" className="w-full gap-0 p-0 data-[side=right]:w-full sm:max-w-md">
        <SheetHeader className="flex-row items-baseline gap-2 border-b px-5 py-4">
          <SheetTitle className="font-heading text-xl">Your cart</SheetTitle>
          {count > 0 && (
            <span className="text-sm text-muted-foreground">
              {count} {count === 1 ? "item" : "items"}
            </span>
          )}
          <SheetDescription className="sr-only">Items you&apos;ve added</SheetDescription>
        </SheetHeader>

        {hasLines ? (
          <>
            <ul className="flex-1 divide-y overflow-y-auto px-5">
              {cart!.lines.map((line) => (
                <CartRow
                  key={line.id}
                  line={line}
                  highlight={line.id === justAdded}
                  onQuantity={(q) => setQuantity(line.id, q)}
                  onRemove={() => remove(line.id)}
                  onNavigate={() => setOpen(false)}
                />
              ))}
            </ul>

            <div className="space-y-4 border-t bg-card px-5 pt-4 pb-5">
              <div className="flex items-baseline justify-between">
                <span className="font-medium">Subtotal</span>
                <span className="numeric font-heading text-2xl font-bold">{formatPrice(cart!.subtotal)}</span>
              </div>
              {cart!.savings > 0 && (
                <p className="-mt-2 text-sm font-semibold text-success">
                  You&apos;re saving <span className="numeric">{formatPrice(cart!.savings)}</span>
                </p>
              )}
              <p className="-mt-2 text-sm text-muted-foreground">Delivery fee and any discount code are added at checkout.</p>
              {cart!.deliveryEstimate && <ArrivalNote estimate={cart!.deliveryEstimate} />}
              {count > 0 ? (
                <SheetClose asChild>
                  <Button asChild size="xl" className="w-full">
                    <Link href="/checkout">
                      Checkout <ArrowRight data-icon="inline-end" />
                    </Link>
                  </Button>
                </SheetClose>
              ) : (
                <Button size="xl" className="w-full" disabled>
                  Remove unavailable items to check out
                </Button>
              )}
              <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <Lock className="size-3.5" /> Secure payment with Mobile Money or card
              </p>
              <PaymentMarks className="-mt-2 justify-center" />
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <span className="grid size-16 place-items-center rounded-2xl bg-brand-50 text-brand-700">
              <ShoppingBag className="size-8" />
            </span>
            <div>
              <p className="font-heading text-xl font-semibold">{cart ? "Your cart is empty" : "Loading your cart…"}</p>
              {cart && <p className="mt-1 text-sm text-muted-foreground">Find something you love — we&apos;ll bring it to you.</p>}
            </div>
            {cart && (
              <SheetClose asChild>
                <Button asChild size="xl">
                  <Link href="/shop">Start shopping</Link>
                </Button>
              </SheetClose>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function CartRow({
  line,
  highlight,
  onQuantity,
  onRemove,
  onNavigate,
}: {
  line: CartLine;
  highlight: boolean;
  onQuantity: (q: number) => void;
  onRemove: () => void;
  onNavigate: () => void;
}) {
  return (
    <li className={cn("-mx-5 flex gap-4 px-5 py-4 transition-colors duration-1000", highlight && "bg-brand-50", line.unavailable && "opacity-70")}>
      <Link
        href={`/products/${line.slug}`}
        onClick={onNavigate}
        className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-muted"
      >
        {line.image ? (
          <ProductImage src={line.image} alt={line.name} fill sizes="80px" className="object-cover" />
        ) : (
          <ImageIcon className="absolute inset-0 m-auto size-6 text-muted-foreground" />
        )}
      </Link>

      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex justify-between gap-3">
          <div className="min-w-0">
            <Link href={`/products/${line.slug}`} onClick={onNavigate} className="line-clamp-2 text-sm leading-snug font-medium hover:underline">
              {line.name}
            </Link>
            {line.variantName && <p className="text-xs text-muted-foreground">{line.variantName}</p>}
          </div>
          {!line.unavailable && (
            <div className="shrink-0 text-right">
              <p className="numeric text-sm font-semibold">{formatPrice(line.lineTotal)}</p>
              {line.compareAtUnit && (
                <p className="numeric text-xs text-muted-foreground line-through">{formatPrice(line.compareAtUnit * line.quantity)}</p>
              )}
            </div>
          )}
        </div>

        {line.unavailable ? (
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-destructive">No longer available</p>
            <button type="button" onClick={onRemove} className="-my-2 -mr-2 min-h-10 px-2 text-xs font-semibold underline">
              Remove
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <div className="flex h-10 items-center rounded-lg border" role="group" aria-label={`Quantity of ${line.name}`}>
              <button
                type="button"
                onClick={() => (line.quantity <= 1 ? onRemove() : onQuantity(line.quantity - 1))}
                className="grid h-full w-10 place-items-center rounded-l-lg hover:bg-muted"
                aria-label={line.quantity <= 1 ? `Remove ${line.name}` : "One fewer"}
              >
                {line.quantity <= 1 ? <Trash2 className="size-3.5" /> : <Minus className="size-3.5" />}
              </button>
              <span className="numeric w-7 text-center text-sm font-semibold">{line.quantity}</span>
              <button
                type="button"
                onClick={() => onQuantity(line.quantity + 1)}
                disabled={line.quantity >= MAX_QTY}
                className="grid h-full w-10 place-items-center rounded-r-lg hover:bg-muted disabled:opacity-40"
                aria-label="One more"
              >
                <Plus className="size-3.5" />
              </button>
            </div>
            <div className="flex items-center gap-3">
              {line.quantity > 1 && <span className="numeric hidden text-xs text-muted-foreground min-[380px]:inline">{formatPrice(line.unitPrice)} each</span>}
              <button
                type="button"
                onClick={onRemove}
                className="-my-2 -mr-2 min-h-10 px-2 text-xs font-medium text-muted-foreground underline-offset-4 hover:text-destructive hover:underline"
              >
                Remove
              </button>
            </div>
          </div>
        )}
      </div>
    </li>
  );
}
