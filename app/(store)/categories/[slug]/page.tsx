import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { CatalogueView } from "@/components/store/catalogue/catalogue-view";
import { ProductImage } from "@/components/store/product-image";
import { parseCatalogueParams, queryCatalogue } from "@/lib/catalogue";
import { prisma } from "@/lib/prisma";
import { getStoreCategories } from "@/lib/storefront";
import { cn } from "@/lib/utils";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

// Hidden categories don't exist as far as customers are concerned
const getCategory = cache((slug: string) =>
  prisma.category.findFirst({
    where: { slug, isActive: true },
    select: { id: true, name: true, slug: true, description: true, image: true },
  }),
);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = await getCategory((await params).slug);
  if (!category) return { title: "Category not found" };
  return {
    title: category.name,
    description: category.description ?? `Shop ${category.name} at Ntemtem Deals — delivered across Ghana in 10-12 days.`,
    alternates: { canonical: `/categories/${category.slug}` },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const category = await getCategory(slug);
  if (!category) notFound();

  const filters = parseCatalogueParams(await searchParams);
  const [result, categories] = await Promise.all([queryCatalogue(filters, category.id), getStoreCategories()]);
  const others = categories.filter((c) => c.slug !== slug && c.productCount > 0);

  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 pb-4 sm:px-8 sm:pt-10">
      <nav aria-label="Breadcrumb" className="mb-3 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          Home
        </Link>
        <span className="mx-2">/</span>
        <Link href="/shop" className="hover:text-foreground">
          Shop
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{category.name}</span>
      </nav>

      <header
        className={cn(
          "relative mb-8 overflow-hidden",
          category.image && "isolate rounded-3xl bg-ink px-6 py-10 text-paper sm:px-10 sm:py-14",
        )}
      >
        {category.image && (
          <>
            <ProductImage src={category.image} alt="" fill preload sizes="(min-width: 1280px) 1200px, 100vw" className="-z-20 object-cover opacity-60" />
            <div className="absolute inset-0 -z-10 bg-linear-to-r from-ink via-ink/80 to-ink/20" />
          </>
        )}
        <h1 className="text-4xl font-bold sm:text-5xl">{category.name}</h1>
        {category.description && (
          <p className={cn("mt-2 max-w-xl", category.image ? "text-paper/75" : "text-muted-foreground")}>{category.description}</p>
        )}
      </header>

      {others.length > 0 && (
        <nav aria-label="Other categories" className="-mx-4 mb-8 overflow-x-auto px-4 sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
          <ul className="flex gap-2">
            {others.map((c) => (
              <li key={c.slug} className="shrink-0">
                <Link href={`/categories/${c.slug}`} className="flex h-9 items-center rounded-full border bg-card px-4 text-sm font-medium hover:bg-muted">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <CatalogueView basePath={`/categories/${slug}`} params={filters} result={result} categories={categories} isCategoryPage />
    </div>
  );
}
