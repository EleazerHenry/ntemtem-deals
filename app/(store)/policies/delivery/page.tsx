import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "@/components/store/content-page";
import { getDeliveryZones } from "@/lib/checkout";
import { deliveryTimeSentence } from "@/lib/content";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "Delivery",
  description: "How Ntemtem Deals delivery works, how long it takes, and where we deliver in Ghana.",
};

const JOURNEY = [
  { title: "Order confirmed", body: "Your payment goes through and your order is locked in." },
  { title: "Sourcing", body: "We buy your item from our supplier." },
  { title: "Shipped", body: "It's on its way to Ghana." },
  { title: "Arrived in Ghana", body: "It clears and reaches us." },
  { title: "Delivered", body: "It comes to you in your city." },
];

function listCities(cities: string[]) {
  return cities.length <= 1 ? cities.join("") : `${cities.slice(0, -1).join(", ")} and ${cities.at(-1)}`;
}

export default async function DeliveryPage() {
  const zones = await getDeliveryZones();
  const pickup = zones.filter((z) => z.isPickup).map((z) => z.city);

  return (
    <ContentPage
      path="/policies/delivery"
      title="Delivery"
      lead={
        <>
          Most Ntemtem Deals products are <strong className="font-semibold text-foreground">sourced to order</strong> — when you buy, we purchase your
          item from our overseas suppliers and bring it to Ghana especially for you.
        </>
      }
    >
      <div className="content-prose">
        <h2 className="!mt-0">How delivery works</h2>
        <p>Here&apos;s the journey your order takes:</p>
      </div>
      <ol className="mt-6 max-w-[68ch] space-y-0">
        {JOURNEY.map((step, i) => (
          <li key={step.title} className="relative flex gap-4 pb-6 last:pb-0">
            {i < JOURNEY.length - 1 && <span className="absolute top-9 bottom-1 left-[17px] w-px bg-border" aria-hidden />}
            <span className="numeric grid size-9 shrink-0 place-items-center rounded-full bg-ink text-sm font-bold text-paper">{i + 1}</span>
            <div className="pt-1.5">
              <p className="font-semibold">{step.title}</p>
              <p className="text-muted-foreground">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="content-prose">
        <p className="!mt-6">You&apos;ll see each step update on your order&apos;s tracking timeline, so you&apos;re never left wondering.</p>

        <h2>How long it takes</h2>
        <p>{deliveryTimeSentence()} You&apos;ll see an estimated arrival date on every product and at checkout.</p>
        <p>We show you a real date range up front, and we keep you updated if anything changes.</p>

        <h2>Where we deliver, and fees</h2>
        <p>
          We deliver to <strong>{listCities(zones.map((z) => z.city))}.</strong> The delivery fee for your city is shown at checkout before you pay —
          no hidden charges.
        </p>
        {pickup.length > 0 && (
          <p>Free pickup is available in {listCities(pickup)} — choose it at checkout to skip the delivery fee.</p>
        )}

        <h2>Tracking your delivery</h2>
        <p>
          Follow your order any time from your <Link href="/account">account</Link>, or at <Link href="/track">Track an order</Link> with your order
          number and email if you checked out as a guest.
        </p>
      </div>
    </ContentPage>
  );
}
