"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Menu, MessageCircle } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type NavCategory = { name: string; slug: string; productCount: number };
type LinkItem = { label: string; href: string };

/** Desktop category row under the header. */
export function CategoryNav({ categories }: { categories: NavCategory[] }) {
  const pathname = usePathname();
  const items = [
    { label: "All products", href: "/shop" },
    ...categories.map((c) => ({ label: c.name, href: `/categories/${c.slug}` })),
  ];
  return (
    <nav aria-label="Categories" className="hidden border-t md:block">
      <ul className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 sm:px-8 [&::-webkit-scrollbar]:hidden">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-11 items-center px-3 text-sm font-medium transition-colors",
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
                {active && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-brand-500" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Phone menu: categories first, then help links. */
export function MobileMenu({
  categories,
  help,
  whatsapp,
}: {
  categories: NavCategory[];
  help: readonly LinkItem[];
  whatsapp: string | null;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="-ml-2 grid size-11 place-items-center rounded-full hover:bg-muted md:hidden" aria-label="Open menu">
        <Menu className="size-[22px]" />
      </SheetTrigger>
      <SheetContent side="left" className="w-[88%] max-w-sm gap-0 overflow-y-auto p-0">
        <SheetTitle className="sr-only">Menu</SheetTitle>
        <SheetDescription className="sr-only">Browse categories and help pages</SheetDescription>
        <div className="ghana-stripe h-1 shrink-0" />
        <div className="px-5 pt-5 pb-3">
          <Link href="/" onClick={close}>
            <Logo />
          </Link>
        </div>
        <nav className="px-3 pb-6">
          <p className="eyebrow px-2 pt-4 pb-2 text-[0.65rem] text-muted-foreground">Shop</p>
          <MenuLink href="/shop" onClick={close} label="All products" />
          {categories.map((c) => (
            <MenuLink
              key={c.slug}
              href={`/categories/${c.slug}`}
              onClick={close}
              label={c.name}
              meta={c.productCount > 0 ? String(c.productCount) : undefined}
            />
          ))}
          <p className="eyebrow px-2 pt-6 pb-2 text-[0.65rem] text-muted-foreground">Help</p>
          {help.map((h) => (
            <MenuLink key={h.href} href={h.href} onClick={close} label={h.label} />
          ))}
          {whatsapp && (
            <a
              href={whatsapp}
              target="_blank"
              rel="noreferrer"
              className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 font-semibold text-ink"
            >
              <MessageCircle className="size-5" /> Chat with us on WhatsApp
            </a>
          )}
        </nav>
      </SheetContent>
    </Sheet>
  );
}

function MenuLink({ href, label, meta, onClick }: { href: string; label: string; meta?: string; onClick: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex h-12 items-center justify-between rounded-xl px-2 text-[0.95rem] font-medium hover:bg-muted"
    >
      {label}
      <span className="flex items-center gap-1.5 text-muted-foreground">
        {meta && <span className="numeric text-xs">{meta}</span>}
        <ChevronRight className="size-4" />
      </span>
    </Link>
  );
}
