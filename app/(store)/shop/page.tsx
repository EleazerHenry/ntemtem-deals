import type { Metadata } from "next";
import Link from "next/link";
import { CatalogueView } from "@/components/store/catalogue/catalogue-view";
import { parseCatalogueParams, queryCatalogue } from "@/lib/catalogue";
import { getStoreCategories } from "@/lib/storefront";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q, sale } = parseCatalogueParams(await searchParams);
  return {
    title: q ? `Results for “${q}”` : sale ? "Deals" : "Shop all products",
    // Filtered/sorted variants of /shop shouldn't compete in search engines
    alternates: { canonical: "/shop" },
  };
}

export default async function ShopPage({ searchParams }: Props) {
  const params = parseCatalogueParams(await searchParams);
  const [result, categories] = await Promise.all([queryCatalogue(params), getStoreCategories()]);
  const activeCategory = categories.find((c) => c.slug === params.category);

  const title = params.q
    ? `Results for “${params.q}”`
    : params.sale
      ? "Deals"
      : activeCategory
        ? activeCategory.name
        : "All products";

  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 pb-4 sm:px-8 sm:pt-10">
      <nav aria-label="Breadcrumb" className="mb-3 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          Home
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">Shop</span>
      </nav>
      <header className="mb-8 space-y-2">
        <h1 className="text-4xl font-bold sm:text-5xl">{title}</h1>
        {!params.q && (
          <p className="max-w-xl text-muted-foreground">
            {params.sale
              ? "Our biggest savings right now — same quality, lower prices."
              : "Everything in the store, sourced for you and delivered across Ghana in 10-12 days."}
          </p>
        )}
      </header>
      <CatalogueView basePath="/shop" params={params} result={result} categories={categories} />
    </div>
  );
}
