"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Settings,
  ShoppingBag,
  Tags,
  TicketPercent,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type NavItem = { label: string; href: string; icon: LucideIcon; soon?: boolean };

const groups: { title: string; items: NavItem[] }[] = [
  {
    title: "Store",
    items: [
      { label: "Overview", href: "/admin", icon: LayoutDashboard },
      { label: "Products", href: "/admin/products", icon: Package },
      { label: "Categories", href: "/admin/categories", icon: Tags },
    ],
  },
  {
    title: "Sales",
    items: [
      { label: "Orders", href: "/admin/orders", icon: ShoppingBag },
      { label: "Discount codes", href: "/admin/coupons", icon: TicketPercent, soon: true },
    ],
  },
  {
    title: "Setup",
    items: [
      { label: "Delivery fees", href: "/admin/delivery", icon: Truck, soon: true },
      { label: "Settings", href: "/admin/settings", icon: Settings },
    ],
  },
];

type Admin = { name: string; email: string };

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/admin" ? pathname === href : pathname.startsWith(href));

  return (
    <nav className="space-y-7">
      {groups.map((group) => (
        <div key={group.title} className="space-y-1">
          <p className="eyebrow px-3 pb-1 text-[0.65rem] text-sidebar-foreground/40">{group.title}</p>
          {group.items.map(({ label, href, icon: Icon, soon }) =>
            soon ? (
              <span
                key={href}
                aria-disabled
                className="flex h-10 items-center gap-3 rounded-lg px-3 text-sm text-sidebar-foreground/35"
              >
                <Icon className="size-[18px]" />
                {label}
                <span className="ml-auto rounded-full border border-sidebar-border px-1.5 py-px text-[0.6rem] font-semibold tracking-wide uppercase">
                  Soon
                </span>
              </span>
            ) : (
              <Link
                key={href}
                href={href}
                onClick={onNavigate}
                aria-current={isActive(href) ? "page" : undefined}
                className={cn(
                  "flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                  isActive(href)
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon className="size-[18px]" />
                {label}
              </Link>
            ),
          )}
        </div>
      ))}
    </nav>
  );
}

function AccountBlock({ admin }: { admin: Admin }) {
  const initials = admin.name
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="space-y-3 border-t border-sidebar-border pt-4">
      <a
        href="/"
        target="_blank"
        rel="noreferrer"
        className="flex h-10 items-center gap-3 rounded-lg px-3 text-sm text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      >
        <ExternalLink className="size-[18px]" />
        View your store
      </a>
      <div className="flex items-center gap-3 rounded-xl bg-sidebar-accent/60 p-2.5">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-500 text-sm font-bold text-ink">
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-sidebar-accent-foreground">{admin.name}</p>
          <p className="truncate text-xs text-sidebar-foreground/50">{admin.email}</p>
        </div>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/admin/login" })}
          className="grid size-9 shrink-0 place-items-center rounded-lg text-sidebar-foreground/60 transition-colors hover:bg-sidebar hover:text-sidebar-accent-foreground"
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut className="size-[18px]" />
        </button>
      </div>
    </div>
  );
}

function SidebarBody({ admin, onNavigate }: { admin: Admin; onNavigate?: () => void }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-8 px-3 py-5">
      <Link href="/admin" onClick={onNavigate} className="px-2">
        <Logo tone="light" />
      </Link>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <NavLinks onNavigate={onNavigate} />
      </div>
      <AccountBlock admin={admin} />
    </div>
  );
}

export function AdminSidebar({ admin }: { admin: Admin }) {
  return (
    <aside className="sticky top-0 hidden h-dvh flex-col bg-sidebar text-sidebar-foreground lg:flex">
      <div className="ghana-stripe h-1 shrink-0" />
      <SidebarBody admin={admin} />
    </aside>
  );
}

export function AdminTopbar({ admin }: { admin: Admin }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-sidebar text-sidebar-foreground lg:hidden">
      <div className="ghana-stripe h-1" />
      <div className="flex h-14 items-center justify-between px-4">
        <Link href="/admin">
          <Logo tone="light" />
        </Link>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            className="grid size-10 place-items-center rounded-lg hover:bg-sidebar-accent"
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-[86%] max-w-xs gap-0 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground"
          >
            <SheetTitle className="sr-only">Admin menu</SheetTitle>
            <div className="ghana-stripe h-1 shrink-0" />
            <SidebarBody admin={admin} onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
