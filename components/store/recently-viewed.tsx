"use client";

import { useEffect, useState } from "react";
import { ProductGrid } from "@/components/store/product-card";
import type { ProductCardData } from "@/lib/storefront";
import { cn } from "@/lib/utils";

// Kept in this browser only: product slugs, newest first.
const KEY = "ntd_recent";
const MAX = 12;

function read(): string[] {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(list) ? list.filter((s): s is string => typeof s === "string").slice(0, MAX) : [];
  } catch {
    return [];
  }
}

/** Put on the product page: remembers that this product was looked at. */
export function RecordView({ slug }: { slug: string }) {
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify([slug, ...read().filter((s) => s !== slug)].slice(0, MAX)));
    } catch {}
  }, [slug]);
  return null;
}

/** A row of up to 4 products this visitor looked at before (minus `exclude`). Renders nothing for first-time visitors. */
export function RecentlyViewed({ exclude = [], className }: { exclude?: string[]; className?: string }) {
  const [products, setProducts] = useState<ProductCardData[]>([]);

  const skip = exclude.join(",");
  useEffect(() => {
    const hidden = new Set(skip.split(","));
    const slugs = read().filter((s) => !hidden.has(s)).slice(0, 8);
    if (!slugs.length) return;
    let alive = true;
    fetch(`/api/products/recent?slugs=${slugs.join(",")}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((list: ProductCardData[]) => alive && setProducts(list.slice(0, 4)))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [skip]);

  if (!products.length) return null;
  return (
    <section className={cn("mt-20", className)} aria-labelledby="recently-viewed">
      <div className="mb-7 space-y-1.5">
        <p className="eyebrow text-brand-700">Pick up where you left off</p>
        <h2 id="recently-viewed" className="text-3xl font-semibold sm:text-4xl">
          Recently viewed
        </h2>
      </div>
      <ProductGrid products={products} />
    </section>
  );
}
