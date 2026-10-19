import Link from "next/link";
import { ArrowRight, BadgeCheck, CreditCard, MapPin, MessageCircle, PackageSearch, Plane, Smartphone, Truck } from "lucide-react";
import { ProductGrid } from "@/components/store/product-card";
import { ProductImage } from "@/components/store/product-image";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import { site, whatsappLink } from "@/lib/site";
import {
  getDeals,
  getFeaturedProducts,
  getNewArrivals,
  getStoreCategories,
  type ProductCardData,
  type StoreCategory,
} from "@/lib/storefront";

export const revalidate = 600;

export default async function HomePage() {
  const [categories, featured, deals, newest] = await Promise.all([
    getStoreCategories(),
    getFeaturedProducts(8),
    getDeals(8),
    getNewArrivals(8),
  ]);
  // Nothing marked "Show on homepage" yet? Show the newest instead.
  const spotlight = featured.length ? featured : newest;
  const heroProducts = spotlight.filter((p) => p.image).slice(0, 3);
  // Complete rows of 4 on desktop (and 2 on phones) — no lonely last row
  const fullRows = <T,>(items: T[]) => (items.length >= 4 ? items.slice(0, items.length - (items.length % 4)) : items);
  const whatsapp = whatsappLink("Hi Ntemtem Deals! I'd like to order.");

  return (
    <>
      <Hero products={heroProducts} />
      <TrustStrip />

      {categories.some((c) => c.productCount > 0) && <CategoryTiles categories={categories.filter((c) => c.productCount > 0)} />}

      {spotlight.length > 0 ? (
        <Section
          eyebrow={featured.length ? "Featured" : "Just in"}
          title={featured.length ? "Handpicked for you" : "New arrivals"}
          link={{ href: "/shop", label: "Shop all" }}
        >
          <ProductGrid products={fullRows(spotlight)} preloadFirst={2} />
        </Section>
      ) : (
        <ComingSoon />
      )}

      {deals.length > 0 && <Deals products={fullRows(deals)} best={deals[0].percentOff} />}

      <HowItWorks />

      {whatsapp && (
        <section className="mx-auto mt-20 max-w-7xl px-4 sm:px-8">
          <div className="flex flex-col items-start gap-6 rounded-3xl border bg-card p-7 shadow-soft sm:flex-row sm:items-center sm:justify-between sm:p-10">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold sm:text-3xl">Rather order on WhatsApp?</h2>
              <p className="max-w-lg text-muted-foreground">
                Send us a photo or a link of what you want — we&apos;ll give you a price and handle the rest.
              </p>
            </div>
            <Button asChild size="xl" className="bg-[#25D366] text-ink hover:bg-[#1fbe5a]">
              <a href={whatsapp} target="_blank" rel="noreferrer">
                <MessageCircle data-icon="inline-start" /> Chat to order
              </a>
            </Button>
          </div>
        </section>
      )}
    </>
  );
}

function Hero({ products }: { products: ProductCardData[] }) {
  return (
    <section className="mx-auto max-w-7xl px-4 pt-4 sm:px-8 sm:pt-8">
      <div className="relative isolate overflow-hidden rounded-[2rem] bg-ink text-paper">
        <div aria-hidden className="absolute -top-32 -right-24 -z-10 size-[30rem] rounded-full bg-brand-500/30 blur-3xl" />
        <div aria-hidden className="absolute -bottom-40 -left-20 -z-10 size-[24rem] rounded-full bg-brand-600/15 blur-3xl" />

        <div className="grid items-center gap-10 px-6 py-10 sm:px-12 sm:py-16 lg:grid-cols-[1.05fr_1fr] lg:gap-6 lg:py-20">
          <div className="space-y-6">
            <p className="eyebrow inline-flex items-center gap-2 rounded-full border border-paper/15 px-3 py-1.5 text-[0.68rem] text-paper/80">
              <span className="size-1.5 rounded-full bg-brand-400" /> New deals every week
            </p>
            <h1 className="text-[2.6rem] leading-[1.02] font-bold sm:text-6xl lg:text-7xl">
              Quality finds.
              <br />
              Honest prices.
              <br />
              <span className="text-brand-400">Brought to you.</span>
            </h1>
            <p className="max-w-md text-base text-paper/70 sm:text-lg">
              Gadgets, accessories and home essentials — sourced for you and delivered across Ghana in{" "}
              {site.deliveryDays}.
            </p>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
              <Button asChild size="xl">
                <Link href="/shop">
                  Shop all deals <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
              <a href="#how-it-works" className="text-sm font-semibold text-paper/80 underline-offset-4 hover:text-paper hover:underline">
                How it works
              </a>
            </div>
          </div>

          {products.length > 0 ? <HeroMosaic products={products} /> : <HeroGraphic />}
        </div>
      </div>
    </section>
  );
}

function HeroMosaic({ products }: { products: ProductCardData[] }) {
  const layouts = [
    "left-0 top-6 w-[58%] -rotate-3 z-10",
    "right-0 top-0 w-[48%] rotate-3",
    "right-[8%] bottom-0 w-[44%] -rotate-2 z-20",
  ];
  return (
    <div className="relative mx-auto aspect-[1.1] w-full max-w-md lg:max-w-none">
      {products.map((p, i) => (
        <Link
          key={p.id}
          href={`/products/${p.slug}`}
          className={`absolute ${layouts[i]} overflow-hidden rounded-3xl bg-paper p-2 shadow-lift transition-transform duration-500 ease-out-expo hover:z-30 hover:scale-[1.03] hover:rotate-0`}
        >
          <div className="relative aspect-square overflow-hidden rounded-2xl bg-muted">
            <ProductImage src={p.image!} alt={p.name} fill preload={i === 0} sizes="(min-width: 1024px) 320px, 55vw" className="object-cover" />
            {p.percentOff > 0 && (
              <span className="absolute top-2 left-2 rounded-full bg-ghana-red px-2 py-0.5 text-[0.7rem] font-bold text-paper">
                −{p.percentOff}%
              </span>
            )}
          </div>
          <p className="numeric px-1.5 pt-2 pb-0.5 font-heading text-base font-semibold text-ink">{formatPrice(p.price)}</p>
        </Link>
      ))}
    </div>
  );
}

function HeroGraphic() {
  return (
    <div aria-hidden className="relative mx-auto grid aspect-square w-full max-w-sm place-items-center">
      <div className="absolute inset-6 rounded-[2.5rem] border border-paper/10" />
      <div className="absolute inset-16 rotate-6 rounded-[2rem] bg-brand-500/90 shadow-glow" />
      <div className="absolute inset-16 -rotate-6 overflow-hidden rounded-[2rem] bg-paper">
        <div className="ghana-stripe h-2" />
        <div className="grid h-full place-items-center pb-6 font-heading text-6xl font-bold text-ink">
          <span>
            −<span className="text-brand-500">%</span>
          </span>
        </div>
      </div>
    </div>
  );
}

function TrustStrip() {
  const items = [
    { icon: Truck, title: `Delivered in ${site.deliveryDays}`, body: "Tracked from order to your door" },
    { icon: Smartphone, title: "MoMo or card", body: "MTN, Telecel, AirtelTigo & cards" },
    { icon: MapPin, title: "4 cities", body: site.cities.join(", ") },
    { icon: BadgeCheck, title: "Quality checked", body: "Refunds if something's wrong" },
  ];
  return (
    <section className="mx-auto max-w-7xl px-4 pt-6 sm:px-8">
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {items.map(({ icon: Icon, title, body }) => (
          <li key={title} className="flex gap-3 rounded-2xl border bg-card p-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
              <Icon className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold">{title}</span>
              <span className="block text-xs text-muted-foreground">{body}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Section({
  eyebrow,
  title,
  link,
  children,
  id,
}: {
  eyebrow: string;
  title: string;
  link?: { href: string; label: string };
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className="mx-auto mt-20 max-w-7xl px-4 sm:px-8">
      <div className="mb-7 flex items-end justify-between gap-4">
        <div className="space-y-1.5">
          <p className="eyebrow text-brand-700">{eyebrow}</p>
          <h2 className="text-3xl font-semibold sm:text-4xl">{title}</h2>
        </div>
        {link && (
          <Link href={link.href} className="flex shrink-0 items-center gap-1 text-sm font-semibold hover:text-brand-700">
            {link.label} <ArrowRight className="size-4" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function CategoryTiles({ categories }: { categories: StoreCategory[] }) {
  return (
    <Section eyebrow="Browse" title="Shop by category">
      <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 lg:grid-cols-6 [&::-webkit-scrollbar]:hidden">
        {categories.map((c) => (
          <li key={c.id} className="w-36 shrink-0 snap-start sm:w-auto">
            <Link href={`/categories/${c.slug}`} className="group block space-y-2.5">
              <div className="relative aspect-square overflow-hidden rounded-2xl bg-linear-to-br from-brand-100 to-brand-200">
                {c.image ? (
                  <ProductImage src={c.image} alt="" fill sizes="(min-width: 1024px) 200px, (min-width: 640px) 30vw, 144px" className="object-cover transition duration-500 ease-out-expo group-hover:scale-105" />
                ) : (
                  <span className="grid size-full place-items-center font-heading text-5xl font-bold text-brand-800/40">
                    {c.name.charAt(0)}
                  </span>
                )}
              </div>
              <div className="px-0.5">
                <p className="text-sm leading-tight font-semibold group-hover:text-brand-700">{c.name}</p>
                <p className="text-xs text-muted-foreground">
                  {c.productCount} {c.productCount === 1 ? "item" : "items"}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function Deals({ products, best }: { products: ProductCardData[]; best: number }) {
  return (
    <section className="mx-auto mt-20 max-w-7xl px-4 sm:px-8">
      <div className="rounded-[2rem] bg-brand-50 px-4 py-10 sm:px-10 sm:py-14">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1.5">
            <p className="eyebrow text-ghana-red">Deals</p>
            <h2 className="text-3xl font-semibold sm:text-4xl">
              Save big — <span className="text-ghana-red">up to {best}% off</span>
            </h2>
            <p className="text-muted-foreground">Same quality, lower prices. While they last.</p>
          </div>
          <Link href="/shop?sale=1&sort=discount" className="flex shrink-0 items-center gap-1 text-sm font-semibold hover:text-brand-700">
            See all deals <ArrowRight className="size-4" />
          </Link>
        </div>
        <ProductGrid products={products} />
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { icon: CreditCard, title: "Order & pay", body: "Pick what you love and pay safely with Mobile Money or card." },
    { icon: Plane, title: "We source it", body: "We buy your item from trusted suppliers and ship it to Ghana." },
    {
      icon: PackageSearch,
      title: `Delivered in ${site.deliveryDays}`,
      body: "Follow every step from your account, then receive it at your door.",
    },
  ];
  return (
    <section id="how-it-works" className="mx-auto mt-20 max-w-7xl scroll-mt-28 px-4 sm:px-8">
      <div className="mb-8 max-w-xl space-y-1.5">
        <p className="eyebrow text-brand-700">How it works</p>
        <h2 className="text-3xl font-semibold sm:text-4xl">Pre-order made simple</h2>
        <p className="text-muted-foreground">
          We don&apos;t keep shelves full of stock — we order each item for you. That&apos;s how our prices stay low.
        </p>
      </div>
      <ol className="grid gap-4 md:grid-cols-3">
        {steps.map(({ icon: Icon, title, body }, i) => (
          <li key={title} className="relative overflow-hidden rounded-3xl border bg-card p-6 shadow-soft">
            <span className="absolute top-4 right-5 font-heading text-6xl font-bold text-muted">{i + 1}</span>
            <span className="relative grid size-12 place-items-center rounded-2xl bg-ink text-brand-400">
              <Icon className="size-6" />
            </span>
            <h3 className="relative mt-5 text-xl font-semibold">{title}</h3>
            <p className="relative mt-1.5 text-sm text-muted-foreground">{body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function ComingSoon() {
  return (
    <section className="mx-auto mt-20 max-w-7xl px-4 sm:px-8">
      <div className="rounded-3xl border border-dashed bg-card px-6 py-16 text-center">
        <p className="eyebrow text-brand-700">Coming soon</p>
        <h2 className="mt-2 text-3xl font-semibold">New deals are landing soon</h2>
        <p className="mx-auto mt-2 max-w-md text-muted-foreground">
          We&apos;re stocking the shelves. Check back shortly for gadgets, accessories and home essentials.
        </p>
      </div>
    </section>
  );
}
