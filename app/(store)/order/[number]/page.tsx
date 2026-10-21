import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { CheckCircle2 } from "lucide-react";
import { CopyButton } from "@/components/store/checkout/copy-button";
import { PayButton } from "@/components/store/checkout/pay-button";
import { SaveAccountCard } from "@/components/store/checkout/save-account-card";
import { DeliveryCard, OrderSummaryCard } from "@/components/store/orders/order-details";
import { OrderTracker } from "@/components/store/orders/order-tracker";
import { Button } from "@/components/ui/button";
import { authOptions } from "@/lib/auth";
import { isValidOrderKey, orderKey } from "@/lib/checkout";
import { formatPrice } from "@/lib/format";
import { getOrderView } from "@/lib/orders";
import { paystackSecret } from "@/lib/paystack";
import { prisma } from "@/lib/prisma";
import { whatsappLink } from "@/lib/site";

export const metadata: Metadata = { title: "Your order", robots: { index: false, follow: false } };

type Props = { params: Promise<{ number: string }>; searchParams: Promise<{ key?: string; payment?: string }> };

const placedFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Accra" });

export default async function OrderPage({ params, searchParams }: Props) {
  const [{ number }, { key, payment }, session] = await Promise.all([params, searchParams, getServerSession(authOptions)]);
  const order = await getOrderView(number);
  // Without the private key (or being the signed-in owner) the order "doesn't exist"
  const isOwner = !!order?.userId && order.userId === session?.user?.id;
  if (!order || (!isOwner && !isValidOrderKey(order.id, key))) notFound();

  const accountExists = order.guestEmail
    ? !!(await prisma.user.findUnique({ where: { email: order.guestEmail }, select: { id: true } }))
    : true;
  const firstName = order.guestName?.split(/\s+/)[0] ?? "there";
  const paid = order.paymentStatus === "PAID";
  const justPlaced = order.status === "PENDING" && !paid;
  const whatsapp = whatsappLink(`Hi Ntemtem Deals! I have a question about order ${order.orderNumber}.`);

  return (
    <div className="mx-auto max-w-5xl px-4 pt-8 pb-16 sm:px-8 sm:pt-12">
      <header className={justPlaced ? "mb-10 text-center" : "mb-8"}>
        {justPlaced ? (
          <>
            <span className="mx-auto grid size-16 place-items-center rounded-full bg-success/10 text-success">
              <CheckCircle2 className="size-9" />
            </span>
            <h1 className="mt-5 text-3xl font-bold sm:text-4xl">Thank you, {firstName}!</h1>
            <p className="mt-2 text-muted-foreground">Your order is in. Pay for it below so we can start sourcing it.</p>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">Placed {placedFmt.format(order.createdAt)}</p>
            <h1 className="mt-1 text-3xl font-bold sm:text-4xl">Your order</h1>
          </>
        )}
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border bg-card py-1.5 pr-1.5 pl-4 text-sm">
          Order <span className="numeric font-semibold">{order.orderNumber}</span>
          <CopyButton text={order.orderNumber} />
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          {payment === "success" && paid && (
            <p role="status" className="flex items-center gap-2 rounded-2xl bg-success/10 px-4 py-3 text-sm font-medium text-success">
              <CheckCircle2 className="size-4 shrink-0" /> Payment received — thank you, {firstName}! A receipt is on its way to {order.guestEmail}.
            </p>
          )}
          {payment === "failed" && !paid && (
            <p role="alert" className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
              Your payment didn&apos;t go through and you haven&apos;t been charged. You can try again below — with another number or card if you like.
            </p>
          )}
          {payment === "pending" && !paid && (
            <p role="status" className="rounded-2xl bg-warning/25 px-4 py-3 text-sm">
              We&apos;re confirming your payment with Paystack. If you approved it on your phone, this page will show it shortly — refresh in a minute.
            </p>
          )}

          {!paid && order.status !== "CANCELLED" && (
            <section className="rounded-3xl bg-ink p-6 text-paper sm:p-8">
              <h2 className="text-2xl font-semibold">Pay {formatPrice(order.total)}</h2>
              <p className="mt-1.5 text-sm text-paper/70">Mobile Money (MTN, Telecel, AirtelTigo) or card, securely through Paystack.</p>
              <PayButton
                orderNumber={order.orderNumber}
                orderKey={key}
                enabled={!!paystackSecret()}
                whatsapp={whatsappLink(`Hi Ntemtem Deals! I'd like to pay for order ${order.orderNumber}.`)}
                retry={payment === "failed"}
              />
            </section>
          )}

          <OrderTracker status={order.status} history={order.history} deliveryCity={order.deliveryCity} pickup={order.pickup} deliveryDays={order.zoneDays} />

          {!order.userId && !session?.user && (
            <SaveAccountCard orderId={order.id} orderKey={orderKey(order.id)} email={order.guestEmail ?? ""} accountExists={accountExists} />
          )}
        </div>

        <aside className="space-y-6">
          <OrderSummaryCard order={order} />
          <DeliveryCard order={order} />
          {whatsapp && (
            <Button asChild variant="outline" size="lg" className="w-full">
              <a href={whatsapp} target="_blank" rel="noreferrer">
                Questions? Chat with us
              </a>
            </Button>
          )}
          <Button asChild variant="ghost" size="lg" className="w-full">
            <Link href="/shop">Continue shopping</Link>
          </Button>
        </aside>
      </div>
    </div>
  );
}
