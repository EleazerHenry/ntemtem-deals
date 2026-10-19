import Form from "next/form";
import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PRICE_PRESETS, catalogueHref, type CatalogueParams } from "@/lib/catalogue";
import type { StoreCategory } from "@/lib/storefront";
import { cn } from "@/lib/utils";

export function FilterPanel({
  basePath,
  params,
  categories,
}: {
  basePath: string;
  params: CatalogueParams;
  /** Omit on category pages */
  categories?: StoreCategory[];
}) {
  const presetActive = (p: (typeof PRICE_PRESETS)[number]) => params.min === p.min && params.max === p.max;

  return (
    <div className="space-y-8">
      {categories && (
        <FilterGroup title="Category">
          <FilterLink href={catalogueHref(basePath, params, { category: null })} active={!params.category} label="All products" />
          {categories.map((c) => (
            <FilterLink
              key={c.slug}
              href={catalogueHref(basePath, params, { category: c.slug })}
              active={params.category === c.slug}
              label={c.name}
              count={c.productCount}
            />
          ))}
        </FilterGroup>
      )}

      <FilterGroup title="Price">
        {PRICE_PRESETS.map((p) => (
          <FilterLink
            key={p.label}
            href={catalogueHref(basePath, params, presetActive(p) ? { min: null, max: null } : { min: p.min, max: p.max })}
            active={presetActive(p)}
            label={p.label}
          />
        ))}
        <Form action={basePath} className="mt-3 space-y-2.5">
          {params.q && <input type="hidden" name="q" value={params.q} />}
          {params.category && !basePath.startsWith("/categories/") && (
            <input type="hidden" name="category" value={params.category} />
          )}
          {params.sale && <input type="hidden" name="sale" value="1" />}
          {params.sort !== "newest" && <input type="hidden" name="sort" value={params.sort} />}
          <div className="flex items-center gap-2">
            <PriceInput name="min" label="Min" defaultValue={params.min} />
            <span className="text-muted-foreground">–</span>
            <PriceInput name="max" label="Max" defaultValue={params.max} />
          </div>
          <Button type="submit" variant="secondary" className="h-10 w-full">
            Apply price
          </Button>
        </Form>
      </FilterGroup>

      <FilterGroup title="Deals">
        <FilterLink href={catalogueHref(basePath, params, { sale: !params.sale })} active={params.sale} label="On sale only" />
      </FilterGroup>
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="eyebrow mb-2.5 text-[0.7rem] text-muted-foreground">{title}</h2>
      <div className="space-y-0.5">{children}</div>
    </section>
  );
}

function FilterLink({ href, active, label, count }: { href: string; active: boolean; label: string; count?: number }) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "true" : undefined}
      className={cn(
        "flex h-10 items-center gap-2.5 rounded-lg px-2 text-sm transition-colors",
        active ? "font-semibold text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <span
        className={cn(
          "grid size-[18px] shrink-0 place-items-center rounded-md border",
          active ? "border-ink bg-ink text-paper" : "border-input bg-card",
        )}
      >
        {active && <Check className="size-3" strokeWidth={3} />}
      </span>
      <span className="flex-1">{label}</span>
      {count !== undefined && <span className="numeric text-xs text-muted-foreground">{count}</span>}
    </Link>
  );
}

function PriceInput({ name, label, defaultValue }: { name: string; label: string; defaultValue: number | null }) {
  return (
    <label className="relative flex-1">
      <span className="sr-only">{label} price in cedis</span>
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-xs text-muted-foreground">GH₵</span>
      <input
        name={name}
        type="number"
        inputMode="numeric"
        min={0}
        placeholder={label}
        defaultValue={defaultValue ?? ""}
        className="numeric h-10 w-full rounded-lg border bg-card pr-2 pl-10 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-ring/30"
      />
    </label>
  );
}
