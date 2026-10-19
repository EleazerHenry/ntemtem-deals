import "server-only";
import { cache } from "react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Read-only queries for the customer-facing store. Only live products appear.

export const cardSelect = {
  id: true,
  slug: true,
  name: true,
  price: true,
  compareAtPrice: true,
  images: true,
  stockType: true,
  deliveryEstimate: true,
  hasVariants: true,
  createdAt: true,
  category: { select: { name: true, slug: true } },
  variants: { where: { isActive: true }, select: { priceAdjustment: true } },
} satisfies Prisma.ProductSelect;

type CardRow = Prisma.ProductGetPayload<{ select: typeof cardSelect }>;

export type ProductCardData = {
  id: string;
  slug: string;
  name: string;
  categoryName: string;
  image: string | null;
  hoverImage: string | null;
  /** Lowest price a customer can pay (cheapest available option) */
  price: number;
  /** True when options cost different amounts — show "From" */
  priceVaries: boolean;
  compareAtPrice: number | null;
  /** Whole-number % off, 0 when not on sale */
  percentOff: number;
  stockType: "PREORDER" | "IN_STOCK";
  deliveryEstimate: string;
};

export function toCard(p: CardRow): ProductCardData {
  const base = p.price.toNumber();
  const prices =
    p.hasVariants && p.variants.length
      ? p.variants.map((v) => Math.round((base + v.priceAdjustment.toNumber()) * 100) / 100)
      : [base];
  const price = Math.min(...prices);
  const compareAt = p.compareAtPrice?.toNumber() ?? null;
  const onSale = compareAt !== null && compareAt > base;
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    categoryName: p.category.name,
    image: p.images[0] ?? null,
    hoverImage: p.images[1] ?? null,
    price,
    priceVaries: Math.max(...prices) !== price,
    compareAtPrice: onSale ? compareAt : null,
    percentOff: onSale ? Math.round((1 - base / compareAt) * 100) : 0,
    stockType: p.stockType,
    deliveryEstimate: p.deliveryEstimate,
  };
}

const live = { isActive: true } satisfies Prisma.ProductWhereInput;

export const getStoreCategories = cache(async () => {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      image: true,
      _count: { select: { products: { where: live } } },
      // Fallback tile image when the owner hasn't set one
      products: { where: { ...live, images: { isEmpty: false } }, orderBy: { isFeatured: "desc" }, take: 1, select: { images: true } },
    },
  });
  return categories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    image: c.image ?? c.products[0]?.images[0] ?? null,
    productCount: c._count.products,
  }));
});

export type StoreCategory = Awaited<ReturnType<typeof getStoreCategories>>[number];

export async function getFeaturedProducts(limit = 8) {
  const rows = await prisma.product.findMany({
    where: { ...live, isFeatured: true },
    orderBy: { updatedAt: "desc" },
    take: limit,
    select: cardSelect,
  });
  return rows.map(toCard);
}

export async function getNewArrivals(limit = 8) {
  const rows = await prisma.product.findMany({ where: live, orderBy: { createdAt: "desc" }, take: limit, select: cardSelect });
  return rows.map(toCard);
}

/** Biggest savings first. Prisma can't compare two columns, so filter here. */
export async function getDeals(limit = 8) {
  const rows = await prisma.product.findMany({
    where: { ...live, compareAtPrice: { not: null } },
    orderBy: { updatedAt: "desc" },
    take: 60,
    select: cardSelect,
  });
  return rows
    .map(toCard)
    .filter((p) => p.percentOff > 0)
    .sort((a, b) => b.percentOff - a.percentOff)
    .slice(0, limit);
}

export const getLiveProductCount = cache(() => prisma.product.count({ where: live }));

// ---- Product page ----

export type ProductPageData = {
  id: string;
  slug: string;
  name: string;
  description: string;
  images: string[];
  stockType: "PREORDER" | "IN_STOCK";
  deliveryEstimate: string;
  category: { name: string; slug: string };
  price: number;
  compareAtPrice: number | null;
  /** Options in the owner's order; unavailable ones are shown greyed out */
  variants: {
    id: string;
    name: string;
    price: number;
    /** Keeps the product's saving: was-price shifted by the option's adjustment */
    compareAtPrice: number | null;
    isActive: boolean;
    /** Index into images, when the option has its own photo */
    imageIndex: number | null;
  }[];
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export const getProductPage = cache(async (slug: string): Promise<ProductPageData | null> => {
  const p = await prisma.product.findFirst({
    where: { slug, ...live },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      images: true,
      stockType: true,
      deliveryEstimate: true,
      price: true,
      compareAtPrice: true,
      hasVariants: true,
      category: { select: { name: true, slug: true } },
      variants: {
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        select: { id: true, name: true, priceAdjustment: true, isActive: true, imageUrl: true },
      },
    },
  });
  if (!p) return null;

  const base = p.price.toNumber();
  const was = p.compareAtPrice?.toNumber() ?? null;
  const onSale = was !== null && was > base;
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    description: p.description,
    images: p.images,
    stockType: p.stockType,
    deliveryEstimate: p.deliveryEstimate,
    category: p.category,
    price: base,
    compareAtPrice: onSale ? was : null,
    variants: p.hasVariants
      ? p.variants.map((v) => {
          const adj = v.priceAdjustment.toNumber();
          const index = v.imageUrl ? p.images.indexOf(v.imageUrl) : -1;
          return {
            id: v.id,
            name: v.name,
            price: round2(base + adj),
            compareAtPrice: onSale ? round2(was! + adj) : null,
            isActive: v.isActive,
            imageIndex: index >= 0 ? index : null,
          };
        })
      : [],
  };
});

/** Same category first, topped up with the newest from elsewhere. */
export async function getRelatedProducts(productId: string, categorySlug: string, limit = 4) {
  const same = await prisma.product.findMany({
    where: { ...live, id: { not: productId }, category: { slug: categorySlug } },
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
    take: limit,
    select: cardSelect,
  });
  if (same.length >= limit) return same.map(toCard);
  const more = await prisma.product.findMany({
    where: { ...live, id: { notIn: [productId, ...same.map((s) => s.id)] } },
    orderBy: { createdAt: "desc" },
    take: limit - same.length,
    select: cardSelect,
  });
  return [...same, ...more].map(toCard);
}
