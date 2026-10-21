import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { CheckCircle2, CreditCard, MapPin, Package, Plane, Truck, Home, CircleDot } from "lucide-react";
import { CopyButton } from "@/components/store/checkout/copy-button";
import { SaveAccountCard } from "@/components/store/checkout/save-account-card";
import { Button } from "@/components/ui/button";
import { authOptions } from "@/lib/auth";
import { isValidOrderKey, orderKey } from "@/lib/checkout";
import { formatPhone, formatPrice } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Your order", robots: { index: false, follow: false } };

type Props = { params: Promise<{ number: string }>; searchParams: Promise<{ key?: string }> };

const STEPS = [
  { status: "PENDING", label: "Order placed", icon: CircleDot },
  { status: "CONFIRMED", label: "Paid", icon: CreditCard },
  { status: "SOURCING", label: "Being sourced", icon: Package },
  { status: "SHIPPED", label: "On the way to Ghana", icon: Plane },
  { status: "ARRIVED", label: "Arrived in Ghana", icon: Truck },
  { status: "DELIVERED", label: "Delivered", icon: Home },
] as const;

export default async function OrderPage({ params, searchParams }: Props) {
  const [{ number }, { key }, session] = await Promise.all([params, searchParams, getServerSession(authOptions)]);
  const order = await prisma.order.findUnique({
    where: { orderNumber: number },
    include: { items: true, coupon: { select: { code: true } } },
  });
  // Without the private key (or being the signed-in owner) the order "doesn't exist"
  const isOwner = !!order?.userId && order.userId === session?.user?.id;
  if (!order || (!isOwner && !isValidOrderKey(order.id, key))) notFound();

  const accountExists = order.guestEmail
    ? !!(await prisma.user.findUnique({ where: { email: order.guestEmail }, select: { id: true } }))
    : true;
  const firstName = order.guestName?.split(/\s+/)[0] ?? "there";
  const stepIndex = STEPS.findIndex((s) => s.status === order.status);
  const pickup = order.deliveryArea === "Free pickup";

  return (
    <div className="mx-auto max-w-5xl px-4 pt-8 pb-16 sm:px-8 sm:pt-12">
      <header className="mb-10 text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-success/10 text-success">
          <CheckCircle2 className="size-9" />
        </span>
        <h1 className="mt-5 text-3xl font-bold sm:text-4xl">Thank you, {firstName}!</h1>
        <p className="mt-2 text-muted-foreground">Your order is in. Complete payment so we can start sourcing it.</p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border bg-card py-1.5 pr-1.5 pl-4 text-sm">
          Order <span className="numeric font-semibold">{order.orderNumber}</span>
          <CopyButton text={order.orderNumber} />
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-8">
          {order.paymentStatus === "UNPAID" && (
            <section className="rounded-3xl bg-ink p-6 text-paper sm:p-8">
              <p className="eyebrow text-brand-400">Next step</p>
              <h2 className="mt-1.5 text-2xl font-semibold">Pay {formatPrice(order.total.toNumber())}</h2>
              <p className="mt-1.5 text-sm text-paper/70">Mobile Money (MTN, Telecel, AirtelTigo) or card, through Paystack.</p>
              {/* Phase 4 wires Paystack here */}
              <Button size="xl" className="mt-6 w-full sm:w-auto" disabled>
                <CreditCard data-icon="inline-start" /> Proceed to payment
              </Button>
              <p className="mt-3 text-sm text-paper/60">
                Online payment is being switched on — you&apos;ll be able to pay right here very soon. Your order is saved.
              </p>
            </section>
          )}

          <section>
            <h2 className="mb-4 text-xl font-semibold">Order status</h2>
            <ol className="space-y-0">
              {STEPS.map((step, i) => {
                const done = i <= stepIndex;
                const Icon = step.icon;
                return (
                  <li key={step.status} className="relative flex gap-4 pb-6 last:pb-0">
                    {i < STEPS.length - 1 && (
                      <span aria-hidden className={cn("absolute top-9 bottom-0 left-[17px] w-0.5", i < stepIndex ? "bg-success" : "bg-border")} />
                    )}
                    <span
                      className={cn(
                        "relative grid size-9 shrink-0 place-items-center rounded-full",
                        done ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground",
                        i === stepIndex && "ring-4 ring-success/20",
                      )}
                    >
                      <Icon className="size-4" />
                    </span>
                    <div className="pt-1.5">
                      <p className={cn("text-sm font-semibold", !done && "text-muted-foreground")}>{step.label}</p>
                      {i === stepIndex && step.status === "PENDING" && (
                        <p className="text-sm text-muted-foreground">Waiting for payment</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          {!order.userId && !session?.user && (
            <SaveAccountCard orderId={order.id} orderKey={orderKey(order.id)} email={order.guestEmail ?? ""} accountExists={accountExists} />
          )}
        </div>

        <aside className="space-y-6">
          <section className="rounded-3xl border bg-card p-6 shadow-soft">
            <h2 className="mb-4 font-sans text-base font-semibold tracking-normal">Summary</h2>
            <ul className="space-y-3 text-sm">
              {order.items.map((item) => (
                <li key={item.id} className="flex justify-between gap-3">
                  <span className="min-w-0">
                    <span className="line-clamp-2 font-medium">{item.productName}</span>
                    <span className="text-xs text-muted-foreground">
                      {item.variantName ? `${item.variantName} · ` : ""}× {item.quantity}
                    </span>
                  </span>
                  <span className="numeric shrink-0 font-medium">{formatPrice(item.price.toNumber() * item.quantity)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-2 border-t pt-4 text-sm">
              <SummaryRow label="Subtotal" value={formatPrice(order.subtotal.toNumber())} />
              {order.discountAmount.toNumber() > 0 && (
                <SummaryRow
                  label={`Discount${order.coupon ? ` (${order.coupon.code})` : ""}`}
                  value={`−${formatPrice(order.discountAmount.toNumber())}`}
                  className="text-success"
                />
              )}
              <SummaryRow
                label={pickup ? "Pickup" : `Delivery to ${order.deliveryCity}`}
                value={order.deliveryFee.toNumber() === 0 ? "Free" : formatPrice(order.deliveryFee.toNumber())}
              />
              <div className="flex items-baseline justify-between border-t pt-3">
                <dt className="font-semibold">Total</dt>
                <dd className="numeric font-heading text-2xl font-bold">{formatPrice(order.total.toNumber())}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-3xl border bg-card p-6 text-sm shadow-soft">
            <h2 className="mb-3 flex items-center gap-2 font-sans text-base font-semibold tracking-normal">
              <MapPin className="size-4 text-brand-700" /> {pickup ? "Pickup" : "Delivery"}
            </h2>
            <p className="font-medium">{order.guestName}</p>
            <p className="text-muted-foreground">{formatPhone(order.guestPhone)}</p>
            <p className="mt-2">
              {pickup ? `Free pickup in ${order.deliveryCity}` : `${order.deliveryArea}, ${order.deliveryCity}`}
            </p>
            {order.deliveryLandmark && <p className="text-muted-foreground">{order.deliveryLandmark}</p>}
            <p className="mt-3 text-xs text-muted-foreground">Receipt and updates go to {order.guestEmail}.</p>
          </section>

          <Button asChild variant="outline" size="lg" className="w-full">
            <Link href="/shop">Continue shopping</Link>
          </Button>
        </aside>
      </div>
    </div>
  );
}

function SummaryRow({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn("flex justify-between gap-4", className)}>
      <dt className={cn(!className && "text-muted-foreground")}>{label}</dt>
      <dd className="numeric font-medium">{value}</dd>
    </div>
  );
}
