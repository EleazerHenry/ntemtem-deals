import type { Metadata } from "next";
import Link from "next/link";
import bcrypt from "bcryptjs";
import { ArrowRight, Check, Eye, EyeOff, Package, ShieldAlert, ShoppingBag, Star, Tags } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { SEED_PASSWORD } from "@/lib/validations/account";

export const metadata: Metadata = { title: "Overview" };

function greeting() {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Africa/Accra" }).format(new Date()),
  );
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function AdminOverviewPage() {
  const admin = await requireAdmin();

  const [live, hidden, featured, categories, user, toSource] = await Promise.all([
    prisma.product.count({ where: { isActive: true } }),
    prisma.product.count({ where: { isActive: false } }),
    prisma.product.count({ where: { isFeatured: true, isActive: true } }),
    prisma.category.count({ where: { isActive: true } }),
    prisma.user.findUnique({ where: { id: admin.id }, select: { passwordHash: true } }),
    prisma.order.count({ where: { status: "CONFIRMED" } }),
  ]);
  const usingStarterPassword = !!user?.passwordHash && (await bcrypt.compare(SEED_PASSWORD, user.passwordHash));

  const stats = [
    { label: "Live in your store", value: live, hint: "Customers can see and buy these", icon: Eye },
    { label: "Hidden", value: hidden, hint: "Saved, but not shown to customers", icon: EyeOff },
    { label: "On the homepage", value: featured, hint: "Featured products", icon: Star },
    { label: "Categories", value: categories, hint: "Groups customers browse by", icon: Tags },
  ];

  const steps = [
    {
      done: live + hidden > 0,
      title: "Add your first product",
      body: "A name, a price and a few photos. Takes about two minutes.",
      href: "/admin/products/new",
      cta: "Add product",
    },
    {
      done: featured > 0,
      title: "Feature products on your homepage",
      body: "Turn on “Show on homepage” for your best deals so shoppers see them first.",
      href: "/admin/products",
      cta: "Go to products",
    },
  ];

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${admin.name.split(" ")[0]}`}
        description="Here's how your store looks today."
        actions={
          <Button asChild size="lg">
            <Link href="/admin/products/new">
              <Package data-icon="inline-start" /> Add product
            </Link>
          </Button>
        }
      />

      {usingStarterPassword && (
        <Link
          href="/admin/settings"
          className="mb-6 flex items-center gap-3 rounded-2xl border border-ghana-gold bg-warning/20 px-4 py-3.5 text-sm transition-colors hover:bg-warning/30"
        >
          <ShieldAlert className="size-5 shrink-0" />
          <span className="flex-1">
            <strong className="font-semibold">Change your password.</strong> You&apos;re still using the starter password
            from setup.
          </span>
          <ArrowRight className="size-4 shrink-0" />
        </Link>
      )}

      {toSource > 0 && (
        <Link
          href="/admin/orders?status=CONFIRMED"
          className="mb-6 flex items-center gap-3 rounded-2xl bg-brand-500 px-4 py-4 text-ink shadow-glow transition-transform hover:-translate-y-0.5"
        >
          <ShoppingBag className="size-5 shrink-0" />
          <span className="flex-1 font-semibold">
            {toSource === 1 ? "1 paid order is waiting to be sourced" : `${toSource} paid orders are waiting to be sourced`}
          </span>
          <ArrowRight className="size-4 shrink-0" />
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {stats.map(({ label, value, hint, icon: Icon }) => (
          <div key={label} className="rounded-2xl border bg-card p-4 shadow-soft sm:p-5">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-sm font-medium">{label}</span>
              <Icon className="size-4" />
            </div>
            <p className="numeric mt-3 font-heading text-4xl font-semibold">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
          </div>
        ))}
      </div>

      <section className="mt-10 overflow-hidden rounded-2xl border bg-card shadow-soft">
        <div className="border-b px-5 py-4 sm:px-6">
          <h2 className="text-xl font-semibold">Get your store ready</h2>
          <p className="text-sm text-muted-foreground">
            {steps.filter((s) => s.done).length} of {steps.length} done
          </p>
        </div>
        <ol className="divide-y">
          {steps.map((step, i) => (
            <li key={step.title} className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:px-6">
              <span
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold",
                  step.done ? "bg-success text-success-foreground" : "bg-brand-100 text-brand-800",
                )}
              >
                {step.done ? <Check className="size-4" /> : i + 1}
              </span>
              <div className="flex-1">
                <p className={cn("font-medium", step.done && "text-muted-foreground line-through")}>{step.title}</p>
                <p className="text-sm text-muted-foreground">{step.body}</p>
              </div>
              {!step.done && (
                <Button asChild variant="outline">
                  <Link href={step.href}>
                    {step.cta} <ArrowRight data-icon="inline-end" />
                  </Link>
                </Button>
              )}
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
