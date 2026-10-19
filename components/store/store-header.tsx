import Link from "next/link";
import { MessageCircle, Truck } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { CartButton } from "@/components/store/cart-button";
import { SearchBox } from "@/components/store/search-box";
import { CategoryNav, MobileMenu } from "@/components/store/store-nav";
import { site, whatsappLink } from "@/lib/site";
import type { StoreCategory } from "@/lib/storefront";

export function StoreHeader({ categories }: { categories: StoreCategory[] }) {
  const whatsapp = whatsappLink("Hi Ntemtem Deals! I have a question.");

  return (
    <>
      <div className="bg-ink text-paper">
        <div className="ghana-stripe h-1" />
        <p className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-2 text-center text-xs sm:text-[0.8rem]">
          <Truck className="size-3.5 shrink-0 text-brand-400" />
          <span>
            Delivered to <span className="font-semibold">{site.cities.join(" · ")}</span>
            <span className="hidden sm:inline"> in {site.deliveryDays}</span>
          </span>
        </p>
      </div>

      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur-lg supports-[backdrop-filter]:bg-background/75">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-8 md:gap-8">
          <MobileMenu categories={categories} help={site.help} whatsapp={whatsapp} />
          <Link href="/" aria-label={`${site.name} home`} className="shrink-0">
            <Logo />
          </Link>
          <SearchBox className="hidden max-w-xl flex-1 md:block" />
          <div className="ml-auto flex items-center gap-1">
            {whatsapp && (
              <a
                href={whatsapp}
                target="_blank"
                rel="noreferrer"
                className="hidden h-11 items-center gap-2 rounded-full px-4 text-sm font-medium hover:bg-muted lg:flex"
              >
                <MessageCircle className="size-[18px]" /> Chat to order
              </a>
            )}
            <CartButton />
          </div>
        </div>
        <div className="px-4 pb-3 md:hidden">
          <SearchBox />
        </div>
        <CategoryNav categories={categories} />
      </header>
    </>
  );
}
