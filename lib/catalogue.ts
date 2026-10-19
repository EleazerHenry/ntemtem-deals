import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { cardSelect, toCard, type ProductCardData } from "@/lib/storefront";

export const PAGE_SIZE = 24;

export const SORTS = [
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "discount", label: "Biggest discount" },
] as const;
export type SortValue = (typeof SORTS)[number]["value"];

export const PRICE_PRESETS = [
  { label: "Under GH₵100", min: null, max: 100 },
  { label: "GH₵100 – 250", min: 100, max: 250 },
  { label: "GH₵250 – 500", min: 250, max: 500 },
  { label: "Over GH₵500", min: 500, max: null },
] as const;

export type CatalogueParams = {
  q: string;
  category: string | null;
  min: number | null;
  max: number | null;
  sale: boolean;
  sort: SortValue;
  page: number;
};

type RawParams = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const money = (v: string) => {
  const n = Number(v.replace(/[^\d.]/g, ""));
  return v.trim() && Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
};

/** Untrusted URL params -> safe, normalised filters. */
export function parseCatalogueParams(raw: RawParams): CatalogueParams {
  const sort = one(raw.sort);
  const page = Number.parseInt(one(raw.page), 10);
  let min = money(one(raw.min));
  let max = money(one(raw.max));
  if (min !== null && max !== null && min > max) [min, max] = [max, min];
  return {
    q: one(raw.q).trim().slice(0, 80),
    category: one(raw.category).trim().toLowerCase().slice(0, 100) || null,
    min,
    max,
    sale: one(raw.sale) === "1",
    sort: SORTS.some((s) => s.value === sort) ? (sort as SortValue) : "newest",
    page: Number.isFinite(page) && page > 1 ? Math.min(page, 50) : 1,
  };
}

/** Build a catalogue URL with some filters changed. Changing filters resets "Show more". */
export function catalogueHref(basePath: string, params: CatalogueParams, change: Partial<CatalogueParams> = {}) {
  const next = { ...params, page: 1, ...change };
  const search = new URLSearchParams();
  if (next.q) search.set("q", next.q);
  if (next.category && !basePath.startsWith("/categories/")) search.set("category", next.category);
  if (next.min !== null) search.set("min", String(next.min));
  if (next.max !== null) search.set("max", String(next.max));
  if (next.sale) search.set("sale", "1");
  if (next.sort !== "newest") search.set("sort", next.sort);
  if (next.page > 1) search.set("page", String(next.page));
  const qs = search.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export type CatalogueResult = {
  products: ProductCardData[];
  total: number;
  /** How many are shown (page × PAGE_SIZE, capped at total) */
  shown: number;
  hasMore: boolean;
  /** Live products before filters — tells "empty shop" apart from "no matches" */
  unfilteredTotal: number;
};

export async function queryCatalogue(params: CatalogueParams, categoryId?: string): Promise<CatalogueResult> {
  const base: Prisma.ProductWhereInput = { isActive: true, ...(categoryId ? { categoryId } : {}) };
  const where: Prisma.ProductWhereInput = { ...base };

  if (!categoryId && params.category) where.category = { slug: params.category, isActive: true };
  // Every word must appear in the product name or its category name
  const terms = params.q.split(/\s+/).filter((t) => t.length > 0).slice(0, 6);
  if (terms.length) {
    where.AND = terms.map((term) => ({
      OR: [
        { name: { contains: term, mode: "insensitive" } },
        { category: { name: { contains: term, mode: "insensitive" } } },
      ],
    }));
  }

  const [rows, unfilteredTotal] = await Promise.all([
    prisma.product.findMany({ where, select: cardSelect, orderBy: { createdAt: "desc" } }),
    prisma.product.count({ where: base }),
  ]);

  // Price filters/sorts use what the customer actually pays (cheapest available option)
  let cards = rows.map(toCard);
  if (params.min !== null) cards = cards.filter((p) => p.price >= params.min!);
  if (params.max !== null) cards = cards.filter((p) => p.price <= params.max!);
  if (params.sale) cards = cards.filter((p) => p.percentOff > 0);

  if (params.sort === "price-asc") cards.sort((a, b) => a.price - b.price);
  if (params.sort === "price-desc") cards.sort((a, b) => b.price - a.price);
  if (params.sort === "discount") cards.sort((a, b) => b.percentOff - a.percentOff);

  const shown = Math.min(params.page * PAGE_SIZE, cards.length);
  return { products: cards.slice(0, shown), total: cards.length, shown, hasMore: shown < cards.length, unfilteredTotal };
}

export function hasActiveFilters(p: CatalogueParams, ignoreCategory = false) {
  return !!(p.q || (!ignoreCategory && p.category) || p.min !== null || p.max !== null || p.sale);
}
