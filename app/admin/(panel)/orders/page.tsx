import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import type { OrderStatus, Prisma } from "@prisma/client";
import { ChevronRight, Search, ShoppingBag } from "lucide-react";
import { OrderStatusBadge } from "@/components/admin/orders/status-badge";
import { PageHeader } from "@/components/admin/page-header";
import { Input } from "@/components/ui/input";
import { requireAdmin } from "@/lib/dal";
import { formatPrice } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Orders" };

const TABS: { key: string; label: string; status?: OrderStatus }[] = [
  { key: "all", label: "All" },
  { key: "CONFIRMED", label: "Paid — to source", status: "CONFIRMED" },
  { key: "SOURCING", label: "Sourcing", status: "SOURCING" },
  { key: "SHIPPED", label: "Shipped", status: "SHIPPED" },
  { key: "ARRIVED", label: "In Ghana", status: "ARRIVED" },
  { key: "DELIVERED", label: "Delivered", status: "DELIVERED" },
  { key: "PENDING", label: "Awaiting payment", status: "PENDING" },
  { key: "CANCELLED", label: "Cancelled", status: "CANCELLED" },
];

const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Africa/Accra" });
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const params = await searchParams;
  const q = one(params.q).trim().slice(0, 80);
  const tab = TABS.find((t) => t.key === one(params.status)) ?? TABS[0];

  const search: Prisma.OrderWhereInput = q
    ? {
        OR: [
          { orderNumber: { contains: q, mode: "insensitive" } },
          { guestName: { contains: q, mode: "insensitive" } },
          { guestEmail: { contains: q, mode: "insensitive" } },
          { guestPhone: { contains: q.replace(/\s/g, "").replace(/^0/, "") } },
        ],
      }
    : {};
  const [orders, grouped] = await Promise.all([
    prisma.order.findMany({
      where: { ...search, ...(tab.status && { status: tab.status }) },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        orderNumber: true,
        createdAt: true,
        guestName: true,
        deliveryCity: true,
        deliveryArea: true,
        total: true,
        status: true,
        paymentStatus: true,
        _count: { select: { items: true } },
      },
    }),
    prisma.order.groupBy({ by: ["status"], where: search, _count: true }),
  ]);
  const count = (status?: OrderStatus) =>
    status ? (grouped.find((g) => g.status === status)?._count ?? 0) : grouped.reduce((n, g) => n + g._count, 0);
  const href = (key: string) => {
    const p = new URLSearchParams();
    if (key !== "all") p.set("status", key);
    if (q) p.set("q", q);
    return `/admin/orders${p.size ? `?${p}` : ""}`;
  };

  return (
    <>
      <PageHeader title="Orders" description="Move each order along as it happens — customers see every update on their tracking page." />

      <div className="overflow-hidden rounded-2xl border bg-card shadow-soft">
        <div className="flex flex-col gap-3 border-b p-3 sm:p-4">
          <Form action="/admin/orders" className="relative sm:max-w-sm">
            {tab.key !== "all" && <input type="hidden" name="status" value={tab.key} />}
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input name="q" type="search" defaultValue={q} placeholder="Order number, name, email or phone" className="h-10 pl-9" aria-label="Search orders" />
          </Form>
          <nav className="-mx-1 flex gap-1 overflow-x-auto px-1" aria-label="Filter orders">
            {TABS.map((t) => (
              <Link
                key={t.key}
                href={href(t.key)}
                aria-current={t.key === tab.key ? "page" : undefined}
                className={cn(
                  "flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors",
                  t.key === tab.key ? "bg-ink text-paper" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {t.label}
                <span className="numeric text-xs opacity-60">{count(t.status)}</span>
              </Link>
            ))}
          </nav>
        </div>

        {orders.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <ShoppingBag className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-3 font-medium">{q || tab.key !== "all" ? "No orders match" : "No orders yet"}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {q || tab.key !== "all" ? "Try another search or tab." : "New orders appear here the moment customers check out."}
            </p>
          </div>
        ) : (
          <ul className="divide-y">
            {orders.map((o) => (
              <li key={o.orderNumber}>
                <Link href={`/admin/orders/${o.orderNumber}`} className="flex items-center gap-3 px-3 py-3.5 transition-colors hover:bg-muted/60 sm:gap-4 sm:px-4">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="numeric font-semibold">{o.orderNumber}</span>
                      <OrderStatusBadge status={o.status} />
                    </p>
                    <p className="mt-0.5 truncate text-sm">
                      {o.guestName} <span className="text-muted-foreground">in {o.deliveryArea === "Free pickup" ? `${o.deliveryCity} (pickup)` : o.deliveryCity}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {dateFmt.format(o.createdAt)}, {o._count.items} {o._count.items === 1 ? "item" : "items"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="numeric font-semibold">{formatPrice(o.total.toNumber())}</p>
                    <p className={cn("text-xs", o.paymentStatus === "PAID" ? "text-success" : "text-muted-foreground")}>
                      {o.paymentStatus === "PAID" ? "Paid" : o.paymentStatus === "REFUNDED" ? "Refunded" : "Not paid"}
                    </p>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
