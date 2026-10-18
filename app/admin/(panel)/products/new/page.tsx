import { randomUUID } from "node:crypto";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { ProductForm } from "@/components/admin/product-form/product-form";
import { getCloudinaryConfig } from "@/lib/cloudinary";
import { requireAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Add product" };

export default async function NewProductPage() {
  await requireAdmin();

  const categories = await prisma.category.findMany({
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, isActive: true },
  });

  return (
    <>
      <Link
        href="/admin/products"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Products
      </Link>
      <PageHeader title="Add product" description="Fill in the details below. You can change anything later." />
      <ProductForm
        productId={randomUUID()}
        isNew
        uploadsEnabled={getCloudinaryConfig() !== null}
        categories={categories}
        initialValues={{
          name: "",
          slug: "",
          description: "",
          categoryId: "",
          price: "",
          compareAtPrice: "",
          stockType: "PREORDER",
          deliveryEstimate: "10-12 days",
          isActive: true,
          isFeatured: false,
          images: [],
          hasVariants: false,
          variants: [],
        }}
      />
    </>
  );
}
