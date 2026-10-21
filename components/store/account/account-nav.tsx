"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/account", label: "Orders", match: (p: string) => p === "/account" || p.startsWith("/account/orders") },
  { href: "/account/addresses", label: "Addresses", match: (p: string) => p.startsWith("/account/addresses") },
  { href: "/account/profile", label: "Profile", match: (p: string) => p.startsWith("/account/profile") },
];

export function AccountNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Account" className="-mx-4 overflow-x-auto border-b px-4 sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
      <ul className="flex gap-1">
        {TABS.map((t) => {
          const active = t.match(pathname);
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-12 items-center px-4 text-sm font-medium transition-colors",
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
                {active && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-brand-500" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
