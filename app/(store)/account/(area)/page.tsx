import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, ImageIcon, PackageSearch } from "lucide-react";
import { VerifyEmailBanner } from "@/components/store/account/account-actions";
import { FormAlert } from "@/components/store/account/fields";
import { ProductImage } from "@/components/store/product-image";
import { Button } from "@/components/ui/button";
import { attachGuestOrders, requireCustomer } from "@/lib/account";
import { emailConfigured } from "@/lib/email";
import { formatPrice } from "@/lib/format";
import { ORDER_FLOW, STEP_COPY, stepIndex } from "@/lib/order-status";
import { getCustomerOrders } from "@/lib/orders";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Your orders" };

const WELCOME: Record<string, string> = {
  "check-email": "Welcome! We've sent you an email — tap the link in it to confirm your address.",
  "1": "Welcome to Ntemtem Deals! Your account is ready.",
  "password-changed": "Your new password is saved and you're signed in.",
};
const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Accra" });

export default async function AccountOrdersPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const customer = await requireCustomer("/account");
  const { welcome } = await searchParams;
  // Email already proven: guest orders placed with it since then join the account too
  if (customer.emailVerified) await attachGuestOrders(customer.id, customer.email);
  const orders = await getCustomerOrders(customer.id);

  return (
    <div className="space-y-6">
      {welcome && WELCOME[welcome] && <FormAlert tone="success">{WELCOME[welcome]}</FormAlert>}
      {!customer.emailVerified && (
        <VerifyEmailBanner email={customer.email} canSend={emailConfigured() || process.env.EMAIL_LOG_LINKS === "1"} />
      )}

      {orders.length === 0 ? (
        <div className="rounded-3xl border border-dashed bg-card px-6 py-14 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-700">
            <PackageSearch className="size-7" />
          </span>
          <h2 className="mt-5 text-2xl font-semibold">No orders yet</h2>
          <p className="mx-auto mt-2 max-w-sm text-muted-foreground">
            When you order, you&apos;ll follow it here from our supplier all the way to your door.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/shop">Start shopping</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/track">Find a guest order</Link>
            </Button>
          </div>
        </div>
      ) : (
        <ul className="space-y-4">
          {orders.map((o) => {
            const i = stepIndex(o.status);
            const unpaid = o.status === "PENDING";
            const cancelled = o.status === "CANCELLED";
            const label = cancelled ? "Cancelled" : unpaid ? "Waiting for payment" : STEP_COPY[o.status as keyof typeof STEP_COPY].headline;
            return (
              <li key={o.orderNumber}>
                <Link href={`/account/orders/${o.orderNumber}`} className="group block rounded-3xl border bg-card p-5 shadow-soft transition-shadow hover:shadow-lift sm:p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex shrink-0 -space-x-4">
                      {(o.images.length ? o.images : [null]).map((img, k) => (
                        <span key={k} className="relative size-14 overflow-hidden rounded-xl border-2 border-card bg-muted">
                          {img ? <ProductImage src={img} alt="" fill sizes="56px" className="object-cover" /> : <ImageIcon className="absolute inset-0 m-auto size-5 text-muted-foreground" />}
                        </span>
                      ))}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="numeric font-semibold">{o.orderNumber}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {o.lineCount > 1 ? `${o.firstItem} and ${o.lineCount - 1} more` : o.firstQty > 1 ? `${o.firstItem} × ${o.firstQty}` : o.firstItem}
                      </p>
                      <p className="text-xs text-muted-foreground">Placed {dateFmt.format(o.createdAt)}</p>
                    </div>
                    <div className="text-right">
                      <p className="numeric font-heading text-lg font-semibold">{formatPrice(o.total)}</p>
                      <ChevronRight className="ml-auto size-5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <p className={cn("text-sm font-semibold", unpaid && "text-brand-800", cancelled && "text-destructive")}>
                      {label}
                      {unpaid && <span className="font-normal text-muted-foreground"> — tap to pay</span>}
                    </p>
                    {!cancelled && (
                      <div className="grid grid-cols-6 gap-1" aria-hidden>
                        {ORDER_FLOW.map((s, k) => (
                          <span
                            key={s}
                            className={cn(
                              "h-1.5 rounded-full",
                              k < i || o.status === "DELIVERED" ? "bg-success" : k === i ? "bg-brand-500" : "bg-muted",
                            )}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
