import Link from "next/link";
import { ImageIcon, MapPin } from "lucide-react";
import { ProductImage } from "@/components/store/product-image";
import { formatPhone, formatPrice } from "@/lib/format";
import type { OrderView } from "@/lib/orders";
import { cn } from "@/lib/utils";

export function OrderSummaryCard({ order }: { order: OrderView }) {
  return (
    <section className="rounded-3xl border bg-card p-6 shadow-soft">
      <h2 className="mb-4 font-sans text-base font-semibold tracking-normal">Items</h2>
      <ul className="space-y-4">
        {order.items.map((item) => (
          <li key={item.id} className="flex gap-3">
            <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-muted">
              {item.image ? (
                <ProductImage src={item.image} alt="" fill sizes="56px" className="object-cover" />
              ) : (
                <ImageIcon className="absolute inset-0 m-auto size-5 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0 flex-1 text-sm">
              {item.slug ? (
                <Link href={`/products/${item.slug}`} className="line-clamp-2 font-medium hover:underline">
                  {item.name}
                </Link>
              ) : (
                <p className="line-clamp-2 font-medium">{item.name}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {item.option ? `${item.option}, ` : ""}qty {item.quantity}
              </p>
            </div>
            <p className="numeric shrink-0 text-sm font-medium">{formatPrice(item.price * item.quantity)}</p>
          </li>
        ))}
      </ul>
      <dl className="mt-5 space-y-2 border-t pt-4 text-sm">
        <Row label="Subtotal" value={formatPrice(order.subtotal)} />
        {order.discount > 0 && (
          <Row label={`Discount${order.couponCode ? ` (${order.couponCode})` : ""}`} value={`−${formatPrice(order.discount)}`} className="text-success" />
        )}
        <Row label={order.pickup ? "Pickup" : `Delivery to ${order.deliveryCity}`} value={order.deliveryFee === 0 ? "Free" : formatPrice(order.deliveryFee)} />
        <div className="flex items-baseline justify-between border-t pt-3">
          <dt className="font-semibold">{order.paymentStatus === "PAID" ? "Paid" : "Total"}</dt>
          <dd className="numeric font-heading text-2xl font-bold">{formatPrice(order.total)}</dd>
        </div>
      </dl>
    </section>
  );
}

export function DeliveryCard({ order }: { order: OrderView }) {
  return (
    <section className="rounded-3xl border bg-card p-6 text-sm shadow-soft">
      <h2 className="mb-3 flex items-center gap-2 font-sans text-base font-semibold tracking-normal">
        <MapPin className="size-4 text-brand-700" /> {order.pickup ? "Pickup" : "Delivering to"}
      </h2>
      <p className="font-medium">{order.guestName}</p>
      <p className="text-muted-foreground">{formatPhone(order.guestPhone)}</p>
      <p className="mt-2">{order.pickup ? `Free pickup in ${order.deliveryCity}` : `${order.deliveryArea}, ${order.deliveryCity}`}</p>
      {order.deliveryLandmark && <p className="text-muted-foreground">{order.deliveryLandmark}</p>}
    </section>
  );
}

function Row({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn("flex justify-between gap-4", className)}>
      <dt className={cn(!className && "text-muted-foreground")}>{label}</dt>
      <dd className="numeric font-medium">{value}</dd>
    </div>
  );
}
