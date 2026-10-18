import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { ProductForm } from "@/components/admin/product-form/product-form";
import { Badge } from "@/components/ui/badge";
import { getCloudinaryConfig } from "@/lib/cloudinary";
import { requireAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ id: string }> };

async function getProduct(id: string) {
  return prisma.product.findUnique({
    where: { id },
    include: { variants: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }] } },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await requireAdmin();
  const product = await getProduct((await params).id);
  return { title: product ? `Edit ${product.name}` : "Product not found" };
}

const updatedFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Africa/Accra",
});

export default async function EditProductPage({ params }: Props) {
  await requireAdmin();

  const { id } = await params;
  const [product, categories] = await Promise.all([
    getProduct(id),
    prisma.category.findMany({
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, isActive: true },
    }),
  ]);
  if (!product) notFound();

  return (
    <>
      <Link
        href="/admin/products"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Products
      </Link>
      <PageHeader
        title={product.name}
        description={`Last updated ${updatedFormat.format(product.updatedAt)}`}
        actions={
          <Badge
            className={cn(
              "h-7 px-3 text-sm",
              product.isActive ? "bg-success/10 text-success" : "bg-muted text-muted-foreground",
            )}
          >
            {product.isActive ? "Live" : "Hidden"}
          </Badge>
        }
      />
      <ProductForm
        // Remount with fresh values after a save that changed the server copy
        key={product.updatedAt.toISOString()}
        productId={product.id}
        isNew={false}
        uploadsEnabled={getCloudinaryConfig() !== null}
        categories={categories}
        initialValues={{
          name: product.name,
          slug: product.slug,
          description: product.description,
          categoryId: product.categoryId,
          price: product.price.toString(),
          compareAtPrice: product.compareAtPrice?.toString() ?? "",
          stockType: product.stockType,
          deliveryEstimate: product.deliveryEstimate,
          isActive: product.isActive,
          isFeatured: product.isFeatured,
          images: product.images,
          hasVariants: product.hasVariants,
          variants: product.variants.map((v) => {
            const adjustment = v.priceAdjustment.toNumber();
            return {
              key: v.id,
              id: v.id,
              name: v.name,
              priceChange: adjustment > 0 ? "more" : adjustment < 0 ? "less" : "same",
              amount: adjustment === 0 ? "" : Math.abs(adjustment).toString(),
              isActive: v.isActive,
            };
          }),
        }}
      />
    </>
  );
}
