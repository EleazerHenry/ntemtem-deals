import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Lock } from "lucide-react";
import { OrderStatusBadge } from "@/components/admin/orders/status-badge";
import { StatusPanel } from "@/components/admin/orders/status-panel";
import { requireAdmin } from "@/lib/dal";
import { formatPhone, formatPrice } from "@/lib/format";
import { ADMIN_STEP, INTERNAL_NOTE_PREFIX, isInternalNote } from "@/lib/order-status";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ number: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `Order ${(await params).number}` };
}

const whenFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Africa/Accra" });

export default async function AdminOrderPage({ params }: Props) {
  await requireAdmin();
  const { number } = await params;
  const order = await prisma.order.findUnique({
    where: { orderNumber: number },
    include: {
      items: true,
      payment: true,
      coupon: { select: { code: true } },
      user: { select: { email: true } },
      statusHistory: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!order) notFound();
  const pickup = order.deliveryArea === "Free pickup";

  return (
    <>
      <Link href="/admin/orders" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Orders
      </Link>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="numeric text-3xl font-bold sm:text-4xl">{order.orderNumber}</h1>
          <p className="mt-1 text-muted-foreground">Placed {whenFmt.format(order.createdAt)}</p>
        </div>
        <OrderStatusBadge status={order.status} className="h-8 px-4 text-sm" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <section className="rounded-2xl border bg-card p-5 shadow-soft sm:p-6">
            <h2 className="mb-4 font-sans text-base font-semibold tracking-normal">Items</h2>
            <ul className="divide-y">
              {order.items.map((i) => (
                <li key={i.id} className="flex justify-between gap-4 py-3 text-sm first:pt-0">
                  <span>
                    <span className="font-medium">{i.productName}</span>
                    {i.variantName && <span className="text-muted-foreground"> — {i.variantName}</span>}
                    <span className="block text-xs text-muted-foreground">
                      {formatPrice(i.price.toNumber())} × {i.quantity}
                    </span>
                  </span>
                  <span className="numeric font-medium">{formatPrice(i.price.toNumber() * i.quantity)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-1.5 border-t pt-4 text-sm">
              <Row label="Subtotal" value={formatPrice(order.subtotal.toNumber())} />
              {order.discountAmount.toNumber() > 0 && <Row label={`Discount (${order.coupon?.code ?? "code"})`} value={`−${formatPrice(order.discountAmount.toNumber())}`} />}
              <Row label={pickup ? "Pickup" : "Delivery"} value={order.deliveryFee.toNumber() === 0 ? "Free" : formatPrice(order.deliveryFee.toNumber())} />
              <div className="flex justify-between border-t pt-2.5 text-base font-semibold">
                <dt>Total</dt>
                <dd className="numeric">{formatPrice(order.total.toNumber())}</dd>
              </div>
            </dl>
          </section>

          <div className="grid gap-6 sm:grid-cols-2">
            <section className="rounded-2xl border bg-card p-5 text-sm shadow-soft">
              <h2 className="mb-3 font-sans text-base font-semibold tracking-normal">Customer</h2>
              <p className="font-medium">{order.guestName}</p>
              <p>
                <a href={`tel:${order.guestPhone}`} className="text-brand-700 hover:underline">
                  {formatPhone(order.guestPhone)}
                </a>
              </p>
              <p className="break-all text-muted-foreground">{order.guestEmail}</p>
              <p className="mt-2 text-xs text-muted-foreground">{order.user ? "Has an account" : "Guest checkout"}</p>
            </section>
            <section className="rounded-2xl border bg-card p-5 text-sm shadow-soft">
              <h2 className="mb-3 font-sans text-base font-semibold tracking-normal">{pickup ? "Pickup" : "Delivery"}</h2>
              <p>{pickup ? `Free pickup in ${order.deliveryCity}` : `${order.deliveryArea}, ${order.deliveryCity}`}</p>
              {order.deliveryLandmark && <p className="text-muted-foreground">{order.deliveryLandmark}</p>}
            </section>
          </div>

          <section className="rounded-2xl border bg-card p-5 text-sm shadow-soft">
            <h2 className="mb-3 font-sans text-base font-semibold tracking-normal">Payment</h2>
            {order.payment ? (
              <dl className="grid gap-1.5 sm:grid-cols-2">
                <Row label="Status" value={order.paymentStatus === "PAID" ? "Paid" : order.payment.status === "FAILED" ? "Last attempt failed" : "Not paid yet"} />
                <Row label="Method" value={order.payment.method === "MOMO" ? "Mobile Money" : order.payment.method === "CARD" ? "Card" : "—"} />
                <Row label="Paystack ref" value={order.payment.reference} />
                <Row label="Paid at" value={order.payment.paidAt ? whenFmt.format(order.payment.paidAt) : "—"} />
              </dl>
            ) : (
              <p className="text-muted-foreground">{order.paymentStatus === "PAID" ? "Marked as paid by you." : "The customer hasn't started paying yet."}</p>
            )}
          </section>

          <section className="rounded-2xl border bg-card p-5 shadow-soft sm:p-6">
            <h2 className="mb-1 font-sans text-base font-semibold tracking-normal">History</h2>
            <p className="mb-4 text-sm text-muted-foreground">What the customer sees on their tracking page. Private notes are only shown to you.</p>
            <ol className="space-y-4">
              {order.statusHistory.map((h) => {
                const internal = isInternalNote(h.note);
                return (
                  <li key={h.id} className="flex gap-3 text-sm">
                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-ink" />
                    <div>
                      <p className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{ADMIN_STEP[h.status].label}</span>
                        <time className="text-xs text-muted-foreground">{whenFmt.format(h.createdAt)}</time>
                        {internal && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 text-xs text-muted-foreground">
                            <Lock className="size-3" /> Private
                          </span>
                        )}
                      </p>
                      {h.note && <p className="text-muted-foreground">{internal ? h.note.slice(INTERNAL_NOTE_PREFIX.length).trim() : h.note}</p>}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        </div>

        {/* On phones the next step comes first — moving orders along is the job here */}
        <aside className="order-first lg:sticky lg:top-6 lg:order-none lg:self-start">
          {/* key: a fresh panel (and default note) after every status change */}
          <StatusPanel key={order.status} orderId={order.id} status={order.status} />
        </aside>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="numeric text-right font-medium break-all">{value}</dd>
    </div>
  );
}
