import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CreditCard, PackageSearch, Plane } from "lucide-react";
import { ProductGrid } from "@/components/store/product-card";
import { RecentlyViewed, RecordView } from "@/components/store/recently-viewed";
import { ProductView } from "@/components/store/product/product-view";
import { arrivalWindow } from "@/lib/delivery";
import { ogImageUrl } from "@/lib/product-images";
import { site } from "@/lib/site";
import { getProductPage, getRelatedProducts } from "@/lib/storefront";

type Props = { params: Promise<{ slug: string }> };

// Built on first visit, then cached; admin edits refresh it immediately.
export const revalidate = 600;
export function generateStaticParams() {
  return [];
}

const summary = (text: string) => {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > 155 ? `${flat.slice(0, 152).replace(/\s+\S*$/, "")}…` : flat;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProductPage((await params).slug);
  if (!product) return { title: "Product not found" };
  const description = summary(product.description);
  const images = product.images[0] ? [{ url: ogImageUrl(product.images[0]), width: 1200, height: 630, alt: product.name }] : [];
  return {
    title: product.name,
    description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: { type: "website", title: product.name, description, url: `/products/${product.slug}`, siteName: site.name, images },
    twitter: { card: "summary_large_image", title: product.name, description, images: images.map((i) => i.url) },
  };
}

export default async function ProductPage({ params }: Props) {
  const product = await getProductPage((await params).slug);
  if (!product) notFound();

  const related = await getRelatedProducts(product.id, product.category.slug, 4);
  const productUrl = `${siteUrl()}/products/${product.slug}`;

  return (
    <div className="mx-auto max-w-7xl px-4 pt-5 sm:px-8 sm:pt-8">
      <ProductJsonLd product={product} url={productUrl} />

      <nav aria-label="Breadcrumb" className="mb-5 truncate text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          Home
        </Link>
        <span className="mx-2">/</span>
        <Link href={`/categories/${product.category.slug}`} className="hover:text-foreground">
          {product.category.name}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{product.name}</span>
      </nav>

      <ProductView
        product={product}
        arrival={arrivalWindow(product.deliveryEstimate)}
        cities={site.cities}
        whatsapp={site.whatsapp}
        productUrl={productUrl}
      />

      <div className="mt-16 grid gap-10 border-t pt-12 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-14">
        <section>
          <h2 className="mb-4 text-2xl font-semibold">About this product</h2>
          <div className="max-w-prose text-[0.95rem] leading-relaxed whitespace-pre-line text-foreground/85">{product.description}</div>
        </section>
        {product.stockType === "PREORDER" && (
          <aside className="h-fit rounded-3xl bg-ink p-6 text-paper sm:p-8">
            <p className="eyebrow text-brand-400">Pre-order</p>
            <h2 className="mt-1.5 text-xl font-semibold">How pre-order works</h2>
            <p className="mt-1.5 text-sm text-paper/65">We order each item for you — that&apos;s how our prices stay low.</p>
            <ol className="mt-5 space-y-4">
              {[
                { icon: CreditCard, title: "You order & pay", body: "Securely with Mobile Money or card." },
                { icon: Plane, title: "We source it", body: "From trusted suppliers, shipped to Ghana." },
                { icon: PackageSearch, title: `Delivered in ${product.deliveryEstimate}`, body: "Track every step from your account." },
              ].map(({ icon: Icon, title, body }) => (
                <li key={title} className="flex gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-paper/10 text-brand-400">
                    <Icon className="size-[18px]" />
                  </span>
                  <span className="text-sm">
                    <span className="block font-semibold">{title}</span>
                    <span className="text-paper/65">{body}</span>
                  </span>
                </li>
              ))}
            </ol>
          </aside>
        )}
      </div>

      {related.length > 0 && (
        <section className="mt-20">
          <div className="mb-7 flex items-end justify-between gap-4">
            <h2 className="text-3xl font-semibold">You might also like</h2>
            <Link href={`/categories/${product.category.slug}`} className="shrink-0 text-sm font-semibold hover:text-brand-700">
              More {product.category.name}
            </Link>
          </div>
          <ProductGrid products={related} />
        </section>
      )}

      <RecentlyViewed exclude={[product.slug, ...related.map((p) => p.slug)]} />
      <RecordView slug={product.slug} />
    </div>
  );
}

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");
}

/** schema.org Product, so search results can show price and availability. */
function ProductJsonLd({ product, url }: { product: NonNullable<Awaited<ReturnType<typeof getProductPage>>>; url: string }) {
  const prices = product.variants.length ? product.variants.filter((v) => v.isActive).map((v) => v.price) : [product.price];
  const low = Math.min(...prices);
  const high = Math.max(...prices);
  const availability = product.stockType === "PREORDER" ? "https://schema.org/PreOrder" : "https://schema.org/InStock";
  const offers =
    low === high
      ? { "@type": "Offer", price: low.toFixed(2), priceCurrency: "GHS", availability, url, itemCondition: "https://schema.org/NewCondition" }
      : { "@type": "AggregateOffer", lowPrice: low.toFixed(2), highPrice: high.toFixed(2), offerCount: prices.length, priceCurrency: "GHS", availability, url };

  const data = [
    {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      description: summary(product.description),
      image: product.images.slice(0, 4),
      sku: product.id,
      category: product.category.name,
      brand: { "@type": "Brand", name: site.name },
      offers,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: url.replace(/\/products\/.*$/, "/") },
        { "@type": "ListItem", position: 2, name: product.category.name, item: url.replace(/\/products\/.*$/, `/categories/${product.category.slug}`) },
        { "@type": "ListItem", position: 3, name: product.name, item: url },
      ],
    },
  ];
  // Escape "<" so product text can never close the script tag
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
