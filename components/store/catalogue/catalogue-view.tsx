import Link from "next/link";
import { ArrowDown, PackageSearch, SearchX, X } from "lucide-react";
import { FilterDrawer, SortSelect } from "@/components/store/catalogue/catalogue-controls";
import { FilterPanel } from "@/components/store/catalogue/filter-panel";
import { ProductGrid } from "@/components/store/product-card";
import { Button } from "@/components/ui/button";
import { SORTS, catalogueHref, hasActiveFilters, type CatalogueParams, type CatalogueResult } from "@/lib/catalogue";
import { formatPrice } from "@/lib/format";
import type { StoreCategory } from "@/lib/storefront";

export function CatalogueView({
  basePath,
  params,
  result,
  categories,
  isCategoryPage = false,
}: {
  basePath: string;
  params: CatalogueParams;
  result: CatalogueResult;
  categories: StoreCategory[];
  isCategoryPage?: boolean;
}) {
  const filtersOn = hasActiveFilters(params, isCategoryPage);
  // Empty categories aren't worth a filter row (unless it's the one already picked)
  const filterCategories = categories.filter((c) => c.productCount > 0 || c.slug === params.category);
  const panel = <FilterPanel basePath={basePath} params={params} categories={isCategoryPage ? undefined : filterCategories} />;
  const chips = activeChips(basePath, params, categories, isCategoryPage);

  return (
    <div className="lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10">
      <aside className="hidden lg:block">
        <div className="sticky top-36">{panel}</div>
      </aside>

      <div className="min-w-0">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            <span className="numeric font-semibold text-foreground">{result.total}</span>{" "}
            {result.total === 1 ? "product" : "products"}
          </p>
          <div className="flex items-center gap-2">
            <FilterDrawer activeCount={chips.length}>{panel}</FilterDrawer>
            <SortSelect
              value={params.sort}
              options={SORTS.map((s) => ({ ...s, href: catalogueHref(basePath, params, { sort: s.value }) }))}
            />
          </div>
        </div>

        {chips.length > 0 && (
          <ul className="mb-6 flex flex-wrap gap-2">
            {chips.map((chip) => (
              <li key={chip.label}>
                <Link
                  href={chip.href}
                  scroll={false}
                  className="flex h-8 items-center gap-1.5 rounded-full bg-ink pr-2.5 pl-3.5 text-xs font-medium text-paper hover:bg-ink-soft"
                  aria-label={`Remove filter: ${chip.label}`}
                >
                  {chip.label} <X className="size-3.5" />
                </Link>
              </li>
            ))}
            {chips.length > 1 && (
              <li>
                <Link href={basePath} scroll={false} className="flex h-8 items-center px-2 text-xs font-semibold underline-offset-4 hover:underline">
                  Clear all
                </Link>
              </li>
            )}
          </ul>
        )}

        {result.total > 0 ? (
          <>
            <ProductGrid products={result.products} preloadFirst={4} />
            <div className="mt-12 flex flex-col items-center gap-4">
              <p className="text-sm text-muted-foreground">
                Showing <span className="numeric font-medium text-foreground">{result.shown}</span> of{" "}
                <span className="numeric font-medium text-foreground">{result.total}</span>
              </p>
              {result.hasMore && (
                <span className="h-1 w-48 overflow-hidden rounded-full bg-muted">
                  <span className="block h-full rounded-full bg-brand-500" style={{ width: `${(result.shown / result.total) * 100}%` }} />
                </span>
              )}
              {result.hasMore && (
                <Button asChild size="xl" variant="outline">
                  <Link href={catalogueHref(basePath, params, { page: params.page + 1 })} scroll={false} prefetch={false}>
                    Show more <ArrowDown data-icon="inline-end" />
                  </Link>
                </Button>
              )}
            </div>
          </>
        ) : result.unfilteredTotal === 0 ? (
          <EmptyState
            icon={PackageSearch}
            title={isCategoryPage ? "No products in this category yet" : "New deals are landing soon"}
            body={
              isCategoryPage
                ? "We're adding new items all the time. Have a look around the rest of the shop."
                : "We're stocking the shelves. Check back shortly."
            }
            action={isCategoryPage ? { href: "/shop", label: "Browse all products" } : { href: "/", label: "Back to home" }}
          />
        ) : (
          <EmptyState
            icon={SearchX}
            title={params.q ? `No results for “${params.q}”` : "No products match these filters"}
            body={params.q ? "Check the spelling, or try a shorter word like “charger” or “bag”." : "Try a wider price range or remove a filter."}
            action={filtersOn ? { href: basePath, label: "Clear all filters" } : undefined}
            suggestions={!isCategoryPage && params.q ? categories.filter((c) => c.productCount > 0).slice(0, 6) : undefined}
          />
        )}
      </div>
    </div>
  );
}

function activeChips(basePath: string, params: CatalogueParams, categories: StoreCategory[], isCategoryPage: boolean) {
  const chips: { label: string; href: string }[] = [];
  if (params.q) chips.push({ label: `“${params.q}”`, href: catalogueHref(basePath, params, { q: "" }) });
  if (params.category && !isCategoryPage) {
    const name = categories.find((c) => c.slug === params.category)?.name ?? params.category;
    chips.push({ label: name, href: catalogueHref(basePath, params, { category: null }) });
  }
  if (params.min !== null || params.max !== null) {
    const label =
      params.min !== null && params.max !== null
        ? `${formatPrice(params.min)} – ${formatPrice(params.max)}`
        : params.min !== null
          ? `Over ${formatPrice(params.min)}`
          : `Under ${formatPrice(params.max!)}`;
    chips.push({ label, href: catalogueHref(basePath, params, { min: null, max: null }) });
  }
  if (params.sale) chips.push({ label: "On sale", href: catalogueHref(basePath, params, { sale: false }) });
  return chips;
}

function EmptyState({
  icon: Icon,
  title,
  body,
  action,
  suggestions,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
  action?: { href: string; label: string };
  suggestions?: StoreCategory[];
}) {
  return (
    <div className="rounded-3xl border border-dashed bg-card px-6 py-14 text-center sm:py-20">
      <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-700">
        <Icon className="size-7" />
      </span>
      <h2 className="mt-5 text-2xl font-semibold">{title}</h2>
      <p className="mx-auto mt-2 max-w-sm text-muted-foreground">{body}</p>
      {action && (
        <Button asChild size="lg" variant="secondary" className="mt-6">
          <Link href={action.href}>{action.label}</Link>
        </Button>
      )}
      {suggestions && suggestions.length > 0 && (
        <div className="mt-8">
          <p className="text-sm text-muted-foreground">Or browse a category</p>
          <ul className="mt-3 flex flex-wrap justify-center gap-2">
            {suggestions.map((c) => (
              <li key={c.slug}>
                <Link href={`/categories/${c.slug}`} className="flex h-9 items-center rounded-full border px-4 text-sm font-medium hover:bg-muted">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
