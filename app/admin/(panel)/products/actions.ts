"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { Prisma } from "@prisma/client";
import {
  destroyProductFolder,
  destroyProductPhotos,
  isOwnProductPhoto,
  signProductPhotoUpload,
} from "@/lib/cloudinary";
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

// Existing products use cuids; new ones get a UUID up front so their photos
// can be uploaded into the right folder before the first save.
const PRODUCT_ID = /^[A-Za-z0-9-]{20,40}$/;

export type SaveProductResult =
  | { ok: true; id: string; name: string }
  | { ok: false; fieldErrors?: ProductFieldErrors; formError?: string; slugSuggestion?: string };

async function availableSlug(base: string, excludeId: string) {
  for (let n = 2; n < 100; n++) {
    const candidate = `${base}-${n}`;
    const taken = await prisma.product.findFirst({
      where: { slug: candidate, NOT: { id: excludeId } },
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

/** Create (isNew) or update the product with this id. */
export async function saveProduct(
  target: { id: string; isNew: boolean },
  input: ProductFormValues,
): Promise<SaveProductResult> {
  await requireAdmin();

  const { id, isNew } = target;
  if (!PRODUCT_ID.test(id)) return { ok: false, formError: "Something went wrong — please reload the page." };

  const parsed = productFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: productFieldErrors(parsed.error) };
  const data = parsed.data;

  if (!data.images.every((url) => isOwnProductPhoto(url, id))) {
    return {
      ok: false,
      fieldErrors: { images: "One of the photos couldn't be checked. Remove it and upload it again." },
    };
  }

  const [category, slugOwner, existing] = await Promise.all([
    prisma.category.findUnique({ where: { id: data.categoryId }, select: { id: true } }),
    prisma.product.findFirst({ where: { slug: data.slug, NOT: { id } }, select: { name: true } }),
    prisma.product.findUnique({ where: { id }, select: { slug: true, images: true } }),
  ]);

  if (!isNew && !existing) {
    return { ok: false, formError: "This product no longer exists — it may have been deleted." };
  }
  if (isNew && existing) {
    return { ok: false, formError: "This product was already saved. Go back to Products to see it." };
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
    images: data.images,
  };

  try {
    const product = isNew
      ? await prisma.product.create({ data: { id, ...fields }, select: { id: true, name: true } })
      : await prisma.product.update({ where: { id }, data: fields, select: { id: true, name: true } });

    // Photos removed in the form are deleted from Cloudinary only once the save lands
    const removed = existing?.images.filter((url) => !data.images.includes(url)) ?? [];
    if (removed.length) after(() => destroyProductPhotos(removed));

    revalidateProductPages(data.slug);
    if (existing && existing.slug !== data.slug) revalidatePath(`/products/${existing.slug}`);
    return { ok: true, ...product };
  } catch (error) {
    // Two saves racing for the same web address
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002" &&
      String(error.meta?.target).includes("slug")
    ) {
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
    after(() => destroyProductFolder(id));
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

export type SignPhotoUploadResult =
  | { ok: true; upload: NonNullable<ReturnType<typeof signProductPhotoUpload>> }
  | { ok: false; error: string };

/** Short-lived permission for the browser to upload photos for one product. */
export async function signPhotoUpload(productId: string): Promise<SignPhotoUploadResult> {
  await requireAdmin();
  if (!PRODUCT_ID.test(productId)) return { ok: false, error: "Something went wrong — please reload the page." };

  const upload = signProductPhotoUpload(productId);
  if (!upload) return { ok: false, error: "Photo upload isn't set up yet. You can still save the product without photos." };
  return { ok: true, upload };
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
