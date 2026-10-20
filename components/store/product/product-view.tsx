"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BadgeCheck, Clock, MessageCircle, Minus, PackageCheck, Plus, ShoppingBag, Smartphone, Truck } from "lucide-react";
import { useCart } from "@/components/store/cart/cart-provider";
import { ProductGallery } from "@/components/store/product/product-gallery";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import type { ProductPageData } from "@/lib/storefront";
import { cn } from "@/lib/utils";

const MAX_QTY = 10;

export function ProductView({
  product,
  arrival,
  cities,
  whatsapp,
  productUrl,
}: {
  product: ProductPageData;
  /** "29 Oct – 31 Oct", worked out on the server */
  arrival: string | null;
  cities: readonly string[];
  /** wa.me number, or null when not set up */
  whatsapp: string | null;
  productUrl: string;
}) {
  const { variants } = product;
  const [variantId, setVariantId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [photo, setPhoto] = useState(0);
  const [needsOption, setNeedsOption] = useState(false);
  const optionsRef = useRef<HTMLFieldSetElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [adding, setAdding] = useState(false);
  const cart = useCart();

  const selected = variants.find((v) => v.id === variantId) ?? null;
  const available = variants.filter((v) => v.isActive);
  const prices = available.map((v) => v.price);
  const minPrice = prices.length ? Math.min(...prices) : product.price;
  const varies = prices.length > 1 && Math.max(...prices) !== minPrice;

  // What the price block shows right now
  const price = selected?.price ?? (variants.length ? minPrice : product.price);
  const was = selected ? selected.compareAtPrice : variants.length ? null : product.compareAtPrice;
  const percentOff = was && was > price ? Math.round((1 - price / was) * 100) : 0;
  const galleryBadge = product.compareAtPrice ? `−${Math.round((1 - product.price / product.compareAtPrice) * 100)}%` : undefined;

  // Phone: once the main button scrolls away, keep a slim buy bar at the bottom
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const el = ctaRef.current;
      if (el) setShowStickyBar(el.getBoundingClientRect().bottom < 0);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  function choose(id: string) {
    const v = variants.find((x) => x.id === id);
    if (!v?.isActive) return;
    setVariantId(id);
    setNeedsOption(false);
    if (v.imageIndex !== null) setPhoto(v.imageIndex);
  }

  async function addToCart() {
    if (variants.length && !selected) {
      setNeedsOption(true);
      optionsRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setAdding(true);
    const added = await cart.add(product.id, selected?.id ?? null, qty);
    setAdding(false);
    if (added) setQty(1);
  }

  function orderLink() {
    const option = selected ? ` (${selected.name})` : "";
    const text = `Hi Ntemtem Deals! I'd like to order ${qty} × ${product.name}${option} — ${formatPrice(price)} each.\n${productUrl}`;
    return `https://wa.me/${whatsapp}?text=${encodeURIComponent(text)}`;
  }

  const ctaLabel = variants.length && !selected ? "Choose an option" : "Add to cart";

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-14">
      <div className="lg:sticky lg:top-36 lg:self-start">
        <ProductGallery images={product.images} name={product.name} index={photo} onIndexChange={setPhoto} badge={galleryBadge} />
      </div>

      <div className="space-y-7">
        <div className="space-y-3">
          <Link href={`/categories/${product.category.slug}`} className="eyebrow text-brand-700 hover:underline">
            {product.category.name}
          </Link>
          <h1 className="text-3xl leading-tight font-bold sm:text-4xl">{product.name}</h1>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pt-1" aria-live="polite">
            <p className="numeric font-heading text-3xl font-bold sm:text-4xl">
              {varies && !selected && <span className="font-sans text-base font-medium text-muted-foreground">From </span>}
              {formatPrice(price)}
            </p>
            {was && was > price && (
              <>
                <p className="numeric text-lg text-muted-foreground line-through">{formatPrice(was)}</p>
                <span className="rounded-full bg-ghana-red/10 px-2.5 py-1 text-sm font-semibold text-ghana-red">
                  Save {formatPrice(Math.round((was - price) * 100) / 100)} ({percentOff}%)
                </span>
              </>
            )}
          </div>
          {variants.length > 0 && !selected && product.compareAtPrice && (
            <p className="text-sm font-medium text-ghana-red">On sale — pick an option to see your saving</p>
          )}
        </div>

        <div className="flex items-start gap-3 rounded-2xl bg-brand-50 p-4">
          {product.stockType === "PREORDER" ? (
            <Clock className="mt-0.5 size-5 shrink-0 text-brand-700" />
          ) : (
            <PackageCheck className="mt-0.5 size-5 shrink-0 text-success" />
          )}
          <div className="text-sm">
            <p className="font-semibold">
              {product.stockType === "PREORDER"
                ? `Pre-order · Ships in ${product.deliveryEstimate} from China`
                : `In stock in Ghana · Delivered in ${product.deliveryEstimate}`}
            </p>
            {arrival && (
              <p className="text-muted-foreground">
                Order today, arrives around <span className="font-medium text-foreground">{arrival}</span>
              </p>
            )}
          </div>
        </div>

        {variants.length > 0 && (
          <fieldset ref={optionsRef} className="scroll-mt-40 space-y-3">
            <legend className="mb-3 text-sm">
              <span className="font-semibold">Option:</span>{" "}
              <span className={cn(selected ? "text-foreground" : "text-muted-foreground")}>{selected?.name ?? "choose one"}</span>
            </legend>
            <div role="radiogroup" aria-label="Options" className="flex flex-wrap gap-2">
              {variants.map((v) => {
                const extra = Math.round((v.price - minPrice) * 100) / 100;
                return (
                  <button
                    key={v.id}
                    type="button"
                    role="radio"
                    aria-checked={v.id === variantId}
                    disabled={!v.isActive}
                    onClick={() => choose(v.id)}
                    className={cn(
                      "flex min-h-11 items-center gap-1.5 rounded-xl border px-4 text-sm font-medium transition-all",
                      v.id === variantId
                        ? "border-ink bg-ink text-paper"
                        : "bg-card hover:border-foreground/40",
                      !v.isActive && "cursor-not-allowed border-dashed text-muted-foreground line-through opacity-60 hover:border-border",
                      needsOption && v.isActive && v.id !== variantId && "border-brand-500 ring-3 ring-brand-500/25",
                    )}
                  >
                    {v.name}
                    {v.isActive && extra > 0 && (
                      <span className={cn("numeric text-xs", v.id === variantId ? "text-paper/70" : "text-muted-foreground")}>
                        +{formatPrice(extra)}
                      </span>
                    )}
                    {!v.isActive && <span className="text-xs no-underline">· unavailable</span>}
                  </button>
                );
              })}
            </div>
            {needsOption && (
              <p role="alert" className="text-sm font-medium text-brand-800">
                Please choose an option first.
              </p>
            )}
          </fieldset>
        )}

        <div ref={ctaRef} className="space-y-3">
          <div className="flex gap-3">
            <div className="flex h-14 items-center rounded-xl border bg-card" role="group" aria-label="Quantity">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                disabled={qty <= 1}
                className="grid h-full w-12 place-items-center rounded-l-xl hover:bg-muted disabled:opacity-40"
                aria-label="One fewer"
              >
                <Minus className="size-4" />
              </button>
              <span className="numeric w-8 text-center font-semibold" aria-live="polite" aria-label={`Quantity ${qty}`}>
                {qty}
              </span>
              <button
                type="button"
                onClick={() => setQty((q) => Math.min(MAX_QTY, q + 1))}
                disabled={qty >= MAX_QTY}
                className="grid h-full w-12 place-items-center rounded-r-xl hover:bg-muted disabled:opacity-40"
                aria-label="One more"
              >
                <Plus className="size-4" />
              </button>
            </div>
            <Button size="xl" className="h-14 flex-1 text-base" onClick={addToCart} disabled={adding}>
              <ShoppingBag data-icon="inline-start" /> {adding ? "Adding…" : ctaLabel}
            </Button>
          </div>
          {whatsapp && (
            <Button asChild size="xl" variant="outline" className="h-12 w-full">
              <a href={orderLink()} target="_blank" rel="noreferrer">
                <MessageCircle data-icon="inline-start" /> Order on WhatsApp
              </a>
            </Button>
          )}
        </div>

        <ul className="grid gap-3 border-t pt-6 text-sm sm:grid-cols-3">
          <Perk icon={Truck} title="Delivered to you" body={cities.join(", ")} />
          <Perk icon={Smartphone} title="MoMo or card" body="Pay securely at checkout" />
          <Perk icon={BadgeCheck} title="Peace of mind" body="Refunds if something's wrong" />
        </ul>
      </div>

      {/* Phone buy bar */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-4 py-3 backdrop-blur transition-transform duration-300 ease-out-expo lg:hidden",
          showStickyBar ? "translate-y-0" : "translate-y-full",
        )}
        aria-hidden={!showStickyBar}
      >
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-muted-foreground">{selected ? selected.name : product.name}</p>
            <p className="numeric font-heading text-lg font-bold">
              {varies && !selected && <span className="font-sans text-xs font-medium text-muted-foreground">From </span>}
              {formatPrice(price)}
            </p>
          </div>
          <Button size="lg" className="h-12 px-5" onClick={addToCart} disabled={adding} tabIndex={showStickyBar ? 0 : -1}>
            <ShoppingBag data-icon="inline-start" /> {adding ? "Adding…" : ctaLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Perk({ icon: Icon, title, body }: { icon: React.ComponentType<{ className?: string }>; title: string; body: string }) {
  return (
    <li className="flex gap-2.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-brand-700" />
      <span>
        <span className="block font-medium">{title}</span>
        <span className="block text-xs text-muted-foreground">{body}</span>
      </span>
    </li>
  );
}
