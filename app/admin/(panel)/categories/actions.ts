"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { Prisma } from "@prisma/client";
import {
  destroyCategoryFolder,
  destroyProductPhotos,
  isOwnCategoryImage,
  signCategoryImageUpload,
  type SignedUpload,
} from "@/lib/cloudinary";
import { requireAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import {
  categoryFieldErrors,
  categoryFormSchema,
  type CategoryFieldErrors,
  type CategoryFormValues,
} from "@/lib/validations/category";

// Existing categories use cuids; new ones get a UUID up front for their image folder.
const CATEGORY_ID = /^[A-Za-z0-9-]{20,40}$/;

function revalidateCategoryPages(...slugs: string[]) {
  revalidatePath("/admin", "layout");
  revalidatePath("/");
  for (const slug of slugs) revalidatePath(`/categories/${slug}`);
}

async function availableSlug(base: string, excludeId: string) {
  for (let n = 2; n < 100; n++) {
    const candidate = `${base}-${n}`;
    const taken = await prisma.category.findFirst({ where: { slug: candidate, NOT: { id: excludeId } }, select: { id: true } });
    if (!taken) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export type SaveCategoryResult =
  | { ok: true; category: { id: string; name: string } }
  | { ok: false; fieldErrors?: CategoryFieldErrors; formError?: string; slugSuggestion?: string };

export async function saveCategory(
  target: { id: string; isNew: boolean },
  input: CategoryFormValues,
): Promise<SaveCategoryResult> {
  await requireAdmin();

  const { id, isNew } = target;
  if (!CATEGORY_ID.test(id)) return { ok: false, formError: "Something went wrong — please reload the page." };

  const parsed = categoryFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: categoryFieldErrors(parsed.error) };
  const data = parsed.data;

  if (data.image && !isOwnCategoryImage(data.image, id)) {
    return { ok: false, fieldErrors: { image: "This image couldn't be checked. Remove it and upload it again." } };
  }

  const [existing, slugOwner] = await Promise.all([
    prisma.category.findUnique({ where: { id }, select: { slug: true, image: true } }),
    prisma.category.findFirst({ where: { slug: data.slug, NOT: { id } }, select: { name: true } }),
  ]);
  if (!isNew && !existing) return { ok: false, formError: "This category no longer exists — it may have been deleted." };
  if (isNew && existing) return { ok: false, formError: "This category was already saved." };
  if (slugOwner) {
    return {
      ok: false,
      fieldErrors: { slug: `The “${slugOwner.name}” category already uses this web address.` },
      slugSuggestion: await availableSlug(data.slug, id),
    };
  }

  const fields = {
    name: data.name,
    slug: data.slug,
    description: data.description || null,
    image: data.image || null,
    isActive: data.isActive,
  };

  try {
    let category: { id: string; name: string };
    if (isNew) {
      const last = await prisma.category.aggregate({ _max: { displayOrder: true } });
      category = await prisma.category.create({
        data: { id, ...fields, displayOrder: (last._max.displayOrder ?? 0) + 1 }, // new ones go last
        select: { id: true, name: true },
      });
    } else {
      category = await prisma.category.update({ where: { id }, data: fields, select: { id: true, name: true } });
    }

    // A replaced or removed image is deleted from Cloudinary once the save lands
    if (existing?.image && existing.image !== fields.image) {
      const old = existing.image;
      after(() => destroyProductPhotos([old]));
    }

    revalidateCategoryPages(data.slug, ...(existing && existing.slug !== data.slug ? [existing.slug] : []));
    return { ok: true, category };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return {
        ok: false,
        fieldErrors: { slug: "Another category just took this web address." },
        slugSuggestion: await availableSlug(data.slug, id),
      };
    }
    console.error("saveCategory failed", error);
    return { ok: false, formError: "Something went wrong saving this category. Please try again." };
  }
}

export type ReorderResult = { ok: true } | { ok: false; error: string };

/** Save the order customers see: ids listed first to last. */
export async function reorderCategories(orderedIds: string[]): Promise<ReorderResult> {
  await requireAdmin();

  const all = await prisma.category.findMany({ select: { id: true } });
  const sameSet = all.length === orderedIds.length && new Set(orderedIds).size === orderedIds.length && all.every((c) => orderedIds.includes(c.id));
  if (!sameSet) return { ok: false, error: "Your categories changed in another window. Reload the page and try again." };

  try {
    await prisma.$transaction(
      orderedIds.map((id, index) => prisma.category.update({ where: { id }, data: { displayOrder: index + 1 } })),
    );
    revalidateCategoryPages();
    return { ok: true };
  } catch (error) {
    console.error("reorderCategories failed", error);
    return { ok: false, error: "Couldn't save the new order. Please try again." };
  }
}

export type DeleteCategoryResult = { ok: true; moved: number } | { ok: false; error: string };

/**
 * Delete a category. If it still has products, `moveTo` is required and the
 * products are moved there in the same transaction — a product is never left
 * without a category.
 */
export async function deleteCategory(id: string, moveTo?: string): Promise<DeleteCategoryResult> {
  await requireAdmin();

  const category = await prisma.category.findUnique({
    where: { id },
    select: { slug: true, _count: { select: { products: true } } },
  });
  if (!category) return { ok: true, moved: 0 }; // already gone

  const productCount = category._count.products;
  if (productCount > 0) {
    if (!moveTo || moveTo === id) {
      return { ok: false, error: "Choose where to move this category's products before deleting it." };
    }
    const target = await prisma.category.findUnique({ where: { id: moveTo }, select: { slug: true } });
    if (!target) return { ok: false, error: "The category you picked no longer exists. Choose another." };
  }

  try {
    const [moved] = await prisma.$transaction([
      prisma.product.updateMany({ where: { categoryId: id }, data: { categoryId: moveTo ?? id } }),
      prisma.category.delete({ where: { id } }),
    ]);
    after(() => destroyCategoryFolder(id));
    revalidateCategoryPages(category.slug);
    return { ok: true, moved: productCount > 0 ? moved.count : 0 };
  } catch (error) {
    // A product was added to it between the check and the delete
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return { ok: false, error: "Products were just added to this category. Reload the page and try again." };
    }
    console.error("deleteCategory failed", error);
    return { ok: false, error: "Couldn't delete this category. Please try again." };
  }
}

export type SignCategoryImageResult = { ok: true; upload: SignedUpload } | { ok: false; error: string };

export async function signCategoryImage(categoryId: string): Promise<SignCategoryImageResult> {
  await requireAdmin();
  if (!CATEGORY_ID.test(categoryId)) return { ok: false, error: "Something went wrong — please reload the page." };
  const upload = signCategoryImageUpload(categoryId);
  if (!upload) return { ok: false, error: "Image upload isn't set up yet. You can still save the category without one." };
  return { ok: true, upload };
}
