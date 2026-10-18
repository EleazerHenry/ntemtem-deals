import Image from "next/image";
import { Clock, EyeOff, ImageIcon, PackageCheck, Star, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatGHS } from "@/lib/format";
import { thumbnailUrl } from "@/lib/product-images";
import { cn } from "@/lib/utils";

/** How the product card will look to shoppers, updated as the owner types. */
export function ProductPreview({
  imageUrl,
  name,
  categoryName,
  price,
  compareAtPrice,
  stockType,
  deliveryEstimate,
  isActive,
  isFeatured,
}: {
  imageUrl?: string;
  name: string;
  categoryName?: string;
  price: number | null;
  compareAtPrice: number | null;
  stockType: "PREORDER" | "IN_STOCK";
  deliveryEstimate: string;
  isActive: boolean;
  isFeatured: boolean;
}) {
  const onSale = price !== null && compareAtPrice !== null && compareAtPrice > price;
  const percentOff = onSale ? Math.round((1 - price / compareAtPrice) * 100) : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="eyebrow text-muted-foreground">Customer view</p>
        {isFeatured && isActive && (
          <span className="flex items-center gap-1 text-xs font-medium text-brand-700">
            <Star className="size-3.5 fill-brand-500 text-brand-500" /> On homepage
          </span>
        )}
      </div>

      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border bg-card shadow-lift transition-opacity",
          !isActive && "opacity-60",
        )}
      >
        <div className="relative grid aspect-square place-items-center bg-linear-to-br from-brand-50 to-brand-100">
          {imageUrl ? (
            <Image src={thumbnailUrl(imageUrl, 680)} alt="" fill sizes="340px" className="object-cover" unoptimized />
          ) : (
            <div className="flex flex-col items-center gap-2 text-brand-800/40">
              <ImageIcon className="size-10" />
              <span className="text-xs font-medium">Your main photo</span>
            </div>
          )}
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
            {onSale && <Badge className="bg-ghana-red text-paper">-{percentOff}%</Badge>}
            <Badge variant="outline" className="bg-card/90 backdrop-blur">
              {stockType === "PREORDER" ? <Clock /> : <PackageCheck />}
              {stockType === "PREORDER" ? "Pre-order" : "In stock"}
            </Badge>
          </div>
        </div>
        <div className="space-y-2 p-4">
          {categoryName && <p className="text-xs text-muted-foreground">{categoryName}</p>}
          <h3 className={cn("font-sans text-base leading-snug font-medium", !name && "text-muted-foreground")}>
            {name || "Your product name"}
          </h3>
          <div className="flex items-baseline gap-2">
            <span className="numeric font-heading text-xl font-semibold">
              {price !== null ? formatGHS(price) : "GH₵ —"}
            </span>
            {onSale && (
              <span className="numeric text-sm text-muted-foreground line-through">{formatGHS(compareAtPrice)}</span>
            )}
          </div>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Truck className="size-3.5" /> Delivered in {deliveryEstimate || "…"}
          </p>
        </div>
      </div>

      {!isActive && (
        <p className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2.5 text-sm text-muted-foreground">
          <EyeOff className="size-4 shrink-0" /> Hidden — customers can&apos;t see this product.
        </p>
      )}
    </div>
  );
}
