"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import {
  categoryNameSchema,
  productFieldErrors,
  productFormSchema,
  type ProductFieldErrors,
  type ProductFormValues,
} from "@/lib/validations/product";

export type SaveProductResult =
  | { ok: true; id: string; name: string }
  | { ok: false; fieldErrors?: ProductFieldErrors; formError?: string; slugSuggestion?: string };

async function availableSlug(base: string, excludeId: string | null) {
  for (let n = 2; n < 100; n++) {
    const candidate = `${base}-${n}`;
    const taken = await prisma.product.findFirst({
      where: { slug: candidate, ...(excludeId && { NOT: { id: excludeId } }) },
      select: { id: true },
    });
    if (!taken) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

function revalidateProductPages(slug?: string) {
  revalidatePath("/admin", "layout");
  revalidatePath("/");
  if (slug) revalidatePath(`/products/${slug}`);
}

/** Create (id = null) or update a product. */
export async function saveProduct(id: string | null, input: ProductFormValues): Promise<SaveProductResult> {
  await requireAdmin();

  const parsed = productFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: productFieldErrors(parsed.error) };
  const data = parsed.data;

  const [category, slugOwner, existing] = await Promise.all([
    prisma.category.findUnique({ where: { id: data.categoryId }, select: { id: true } }),
    prisma.product.findFirst({
      where: { slug: data.slug, ...(id && { NOT: { id } }) },
      select: { name: true },
    }),
    id ? prisma.product.findUnique({ where: { id }, select: { slug: true } }) : null,
  ]);

  if (id && !existing) {
    return { ok: false, formError: "This product no longer exists — it may have been deleted." };
  }
  if (!category) {
    return { ok: false, fieldErrors: { categoryId: "That category no longer exists. Please choose another." } };
  }
  if (slugOwner) {
    return {
      ok: false,
      fieldErrors: { slug: `“${slugOwner.name}” already uses this web address.` },
      slugSuggestion: await availableSlug(data.slug, id),
    };
  }

  const fields = {
    name: data.name,
    slug: data.slug,
    description: data.description,
    categoryId: data.categoryId,
    price: data.price,
    compareAtPrice: data.compareAtPrice,
    stockType: data.stockType,
    deliveryEstimate: data.deliveryEstimate,
    isActive: data.isActive,
    isFeatured: data.isFeatured,
  };

  try {
    const product = id
      ? await prisma.product.update({ where: { id }, data: fields, select: { id: true, name: true } })
      : await prisma.product.create({ data: fields, select: { id: true, name: true } });

    revalidateProductPages(data.slug);
    if (existing && existing.slug !== data.slug) revalidatePath(`/products/${existing.slug}`);
    return { ok: true, ...product };
  } catch (error) {
    // Two saves racing for the same web address
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return {
        ok: false,
        fieldErrors: { slug: "Another product just took this web address." },
        slugSuggestion: await availableSlug(data.slug, id),
      };
    }
    console.error("saveProduct failed", error);
    return { ok: false, formError: "Something went wrong saving this product. Please try again." };
  }
}

export type DeleteProductResult = { ok: true } | { ok: false; error: string };

export async function deleteProduct(id: string): Promise<DeleteProductResult> {
  await requireAdmin();

  try {
    // Order items keep their name/price snapshots; their productId becomes null.
    const product = await prisma.product.delete({ where: { id }, select: { slug: true } });
    revalidateProductPages(product.slug);
    return { ok: true };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return { ok: true }; // already gone
    }
    console.error("deleteProduct failed", error);
    return { ok: false, error: "Couldn't delete this product. Please try again." };
  }
}

export type CreateCategoryResult =
  | { ok: true; category: { id: string; name: string }; existed: boolean }
  | { ok: false; error: string };

/** Inline "create new category" from the product form. */
export async function createCategory(rawName: string): Promise<CreateCategoryResult> {
  await requireAdmin();

  const parsed = categoryNameSchema.safeParse(rawName);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const name = parsed.data;
  const slug = slugify(name);
  if (!slug) return { ok: false, error: "Use letters or numbers in the category name." };

  try {
    const existing = await prisma.category.findUnique({ where: { slug }, select: { id: true, name: true } });
    if (existing) return { ok: true, category: existing, existed: true };

    const last = await prisma.category.aggregate({ _max: { displayOrder: true } });
    const category = await prisma.category.create({
      data: { name, slug, displayOrder: (last._max.displayOrder ?? 0) + 1 },
      select: { id: true, name: true },
    });
    revalidatePath("/admin", "layout");
    return { ok: true, category, existed: false };
  } catch (error) {
    console.error("createCategory failed", error);
    return { ok: false, error: "Couldn't create the category. Please try again." };
  }
}
