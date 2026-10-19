import Link from "next/link";
import { ImageIcon, Truck } from "lucide-react";
import { ProductImage } from "@/components/store/product-image";
import { formatPrice } from "@/lib/format";
import type { ProductCardData } from "@/lib/storefront";
import { cn } from "@/lib/utils";

export function ProductCard({
  product,
  preload = false,
  className,
}: {
  product: ProductCardData;
  /** Above-the-fold cards load their image eagerly */
  preload?: boolean;
  className?: string;
}) {
  const { slug, name, image, hoverImage, price, priceVaries, compareAtPrice, percentOff } = product;

  return (
    <Link href={`/products/${slug}`} className={cn("group flex flex-col gap-3 outline-none", className)}>
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-muted ring-ring/50 transition-shadow group-focus-visible:ring-3">
        {image ? (
          <>
            <ProductImage
              src={image}
              alt={name}
              fill
              preload={preload}
              sizes="(min-width: 1280px) 300px, (min-width: 768px) 24vw, 50vw"
              className={cn(
                "object-cover transition duration-500 ease-out-expo group-hover:scale-[1.04]",
                hoverImage && "group-hover:opacity-0",
              )}
            />
            {hoverImage && (
              <ProductImage
                src={hoverImage}
                alt=""
                fill
                sizes="(min-width: 1280px) 300px, (min-width: 768px) 24vw, 50vw"
                className="object-cover opacity-0 transition duration-500 ease-out-expo group-hover:scale-[1.04] group-hover:opacity-100"
              />
            )}
          </>
        ) : (
          <div className="grid size-full place-items-center bg-linear-to-br from-brand-50 to-brand-100 text-brand-800/30">
            <ImageIcon className="size-10" />
          </div>
        )}
        {percentOff > 0 && (
          <span className="absolute top-2.5 left-2.5 rounded-full bg-ghana-red px-2.5 py-1 text-xs font-bold text-paper shadow-soft">
            −{percentOff}%
          </span>
        )}
      </div>

      <div className="space-y-1 px-0.5">
        <h3 className="line-clamp-2 font-sans text-sm leading-snug font-medium tracking-normal text-foreground sm:text-[0.95rem]">
          {name}
        </h3>
        <p className="flex flex-wrap items-baseline gap-x-2">
          <span className="numeric font-heading text-lg font-semibold">
            {priceVaries && <span className="font-sans text-xs font-medium text-muted-foreground">From </span>}
            {formatPrice(price)}
          </span>
          {compareAtPrice && (
            <span className="numeric text-sm text-muted-foreground line-through">{formatPrice(compareAtPrice)}</span>
          )}
        </p>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <Truck className="size-3.5 shrink-0" /> Delivered in {product.deliveryEstimate}
        </p>
      </div>
    </Link>
  );
}

export function ProductGrid({ products, preloadFirst = 0 }: { products: ProductCardData[]; preloadFirst?: number }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-5 md:grid-cols-4">
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} preload={i < preloadFirst} />
      ))}
    </div>
  );
}
