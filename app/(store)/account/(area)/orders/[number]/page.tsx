import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CopyButton } from "@/components/store/checkout/copy-button";
import { PayButton } from "@/components/store/checkout/pay-button";
import { DeliveryCard, OrderSummaryCard } from "@/components/store/orders/order-details";
import { OrderTracker } from "@/components/store/orders/order-tracker";
import { Button } from "@/components/ui/button";
import { requireCustomer } from "@/lib/account";
import { formatPrice } from "@/lib/format";
import { getOrderView } from "@/lib/orders";
import { paystackSecret } from "@/lib/paystack";
import { whatsappLink } from "@/lib/site";

type Props = { params: Promise<{ number: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `Order ${(await params).number}` };
}

const placedFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Accra" });

export default async function AccountOrderPage({ params }: Props) {
  const { number } = await params;
  const customer = await requireCustomer(`/account/orders/${number}`);
  const order = await getOrderView(number);
  // Someone else's order is simply "not found"
  if (!order || order.userId !== customer.id) notFound();
  const whatsapp = whatsappLink(`Hi Ntemtem Deals! I have a question about order ${order.orderNumber}.`);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/account" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> All orders
        </Link>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Placed {placedFmt.format(order.createdAt)}</span>
          <span className="inline-flex items-center gap-1 rounded-full border bg-card py-1 pr-1 pl-3">
            <span className="numeric font-semibold">{order.orderNumber}</span>
            <CopyButton text={order.orderNumber} />
          </span>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          {order.paymentStatus === "UNPAID" && order.status !== "CANCELLED" && (
            <section className="rounded-3xl bg-ink p-6 text-paper sm:p-8">
              <h2 className="text-2xl font-semibold">Pay {formatPrice(order.total)}</h2>
              <p className="mt-1.5 text-sm text-paper/70">Mobile Money (MTN, Telecel, AirtelTigo) or card, securely through Paystack.</p>
              <PayButton orderNumber={order.orderNumber} enabled={!!paystackSecret()} whatsapp={whatsappLink(`Hi Ntemtem Deals! I'd like to pay for order ${order.orderNumber}.`)} />
            </section>
          )}
          <OrderTracker status={order.status} history={order.history} deliveryCity={order.deliveryCity} pickup={order.pickup} />
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
        </aside>
      </div>
    </div>
  );
}
