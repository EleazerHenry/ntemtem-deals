import type { Metadata } from "next";
import { CategoryManager } from "@/components/admin/categories/category-manager";
import { getCloudinaryConfig } from "@/lib/cloudinary";
import { requireAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Categories" };

export default async function AdminCategoriesPage() {
  await requireAdmin();

  const categories = await prisma.category.findMany({
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: true } } },
  });
  const items = categories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    image: c.image,
    isActive: c.isActive,
    productCount: c._count.products,
  }));

  return (
    <CategoryManager
      // Fresh state whenever the saved data changes (after add, edit, delete or reorder)
      key={items.map((c) => [c.id, c.name, c.slug, c.image, c.isActive, c.productCount].join(":")).join("|")}
      categories={items}
      uploadsEnabled={getCloudinaryConfig() !== null}
    />
  );
}
