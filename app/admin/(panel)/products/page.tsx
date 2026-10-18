import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Form from "next/form";
import { ImageIcon, Package, Plus, Search, Star } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireAdmin } from "@/lib/dal";
import { formatGHS } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { thumbnailUrl } from "@/lib/product-images";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Products" };

const filters = [
  { key: "all", label: "All", where: {} },
  { key: "live", label: "Live", where: { isActive: true } },
  { key: "hidden", label: "Hidden", where: { isActive: false } },
  { key: "featured", label: "On homepage", where: { isFeatured: true } },
] satisfies { key: string; label: string; where: Prisma.ProductWhereInput }[];

type Filter = (typeof filters)[number];

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function filterHref(key: string, q: string) {
  const params = new URLSearchParams();
  if (key !== "all") params.set("status", key);
  if (q) params.set("q", q);
  const qs = params.toString();
  return qs ? `/admin/products?${qs}` : "/admin/products";
}

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[]; status?: string | string[] }>;
}) {
  await requireAdmin();

  const params = await searchParams;
  const q = (first(params.q) ?? "").trim().slice(0, 100);
  const active: Filter = filters.find((f) => f.key === first(params.status)) ?? filters[0];
  const search: Prisma.ProductWhereInput = q ? { name: { contains: q, mode: "insensitive" } } : {};

  const [products, counts] = await Promise.all([
    prisma.product.findMany({
      where: { ...active.where, ...search },
      orderBy: { updatedAt: "desc" },
      take: 200,
      include: { category: { select: { name: true } }, _count: { select: { variants: true } } },
    }),
    Promise.all(filters.map((f) => prisma.product.count({ where: { ...f.where, ...search } }))),
  ]);

  const storeIsEmpty = !q && active.key === "all" && products.length === 0;

  return (
    <>
      <PageHeader
        title="Products"
        description="Everything customers can buy in your store. Hidden products are saved but not shown."
        actions={
          !storeIsEmpty && (
            <Button asChild size="lg">
              <Link href="/admin/products/new">
                <Plus data-icon="inline-start" /> Add product
              </Link>
            </Button>
          )
        }
      />

      {storeIsEmpty ? (
        <EmptyStore />
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-card shadow-soft">
          <div className="flex flex-col gap-3 border-b p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
            <nav className="-mx-1 flex gap-1 overflow-x-auto px-1" aria-label="Filter products">
              {filters.map((f, i) => (
                <Link
                  key={f.key}
                  href={filterHref(f.key, q)}
                  aria-current={f.key === active.key ? "page" : undefined}
                  className={cn(
                    "flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors",
                    f.key === active.key ? "bg-ink text-paper" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {f.label}
                  <span className="numeric text-xs opacity-60">{counts[i]}</span>
                </Link>
              ))}
            </nav>
            <Form action="/admin/products" className="relative sm:w-72">
              {active.key !== "all" && <input type="hidden" name="status" value={active.key} />}
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="q"
                type="search"
                defaultValue={q}
                placeholder="Search by product name"
                className="h-10 pl-9"
                aria-label="Search products"
              />
            </Form>
          </div>

          {products.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="font-medium">No products match{q && ` “${q}”`}</p>
              <p className="mt-1 text-sm text-muted-foreground">Try a different word, or clear the filters.</p>
              <Button asChild variant="outline" className="mt-5">
                <Link href="/admin/products">Show all products</Link>
              </Button>
            </div>
          ) : (
            <ul className="divide-y">
              {products.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/admin/products/${p.id}`}
                    className="flex items-center gap-4 px-3 py-3 transition-colors hover:bg-muted/60 sm:px-4"
                  >
                    <div className="relative grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl border bg-muted sm:size-16">
                      {p.images[0] ? (
                        <Image src={thumbnailUrl(p.images[0], 128)} alt="" fill sizes="64px" className="object-cover" unoptimized />
                      ) : (
                        <ImageIcon className="size-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 truncate font-medium">
                        {p.isFeatured && <Star className="size-3.5 shrink-0 fill-brand-500 text-brand-500" aria-label="On homepage" />}
                        <span className="truncate">{p.name}</span>
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        {p.category.name}
                        {p._count.variants > 0 && ` · ${p._count.variants} options`}
                      </p>
                    </div>
                    <div className="hidden text-right sm:block">
                      <p className="numeric font-semibold">{formatGHS(p.price)}</p>
                      {p.compareAtPrice && (
                        <p className="numeric text-xs text-muted-foreground line-through">{formatGHS(p.compareAtPrice)}</p>
                      )}
                    </div>
                    <div className="flex w-20 flex-col items-end gap-1 sm:w-24">
                      <p className="numeric text-sm font-semibold sm:hidden">{formatGHS(p.price)}</p>
                      <Badge
                        className={cn(
                          p.isActive ? "bg-success/10 text-success" : "bg-muted text-muted-foreground",
                        )}
                      >
                        {p.isActive ? "Live" : "Hidden"}
                      </Badge>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  );
}

function EmptyStore() {
  return (
    <div className="relative overflow-hidden rounded-2xl border bg-card px-6 py-16 text-center shadow-soft sm:py-24">
      <div aria-hidden className="absolute -top-24 left-1/2 size-72 -translate-x-1/2 rounded-full bg-brand-200/50 blur-3xl" />
      <div className="relative mx-auto max-w-md">
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-brand-500 text-ink shadow-glow">
          <Package className="size-8" />
        </span>
        <h2 className="mt-6 text-2xl font-semibold">Add your first product</h2>
        <p className="mt-2 text-muted-foreground">
          Give it a name, a price and a few photos — it takes about two minutes. You can keep it hidden until
          you&apos;re ready for customers to see it.
        </p>
        <Button asChild size="xl" className="mt-8">
          <Link href="/admin/products/new">
            <Plus data-icon="inline-start" /> Add product
          </Link>
        </Button>
      </div>
    </div>
  );
}
