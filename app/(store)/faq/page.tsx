import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { ContentPage, WhatsAppNudge } from "@/components/store/content-page";
import { getDeliveryZones } from "@/lib/checkout";
import { content, deliveryTimeSentence } from "@/lib/content";
import { whatsappLink } from "@/lib/site";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "FAQ",
  description: "How ordering, payment, delivery, tracking and refunds work at Ntemtem Deals.",
};

function listCities(cities: string[]) {
  return cities.length <= 1 ? cities.join("") : `${cities.slice(0, -1).join(", ")} and ${cities.at(-1)}`;
}

export default async function FaqPage() {
  const zones = await getDeliveryZones();
  const cities = zones.map((z) => z.city);
  const pickup = zones.filter((z) => z.isPickup).map((z) => z.city);

  const faqs: { q: string; a: React.ReactNode }[] = [
    {
      q: "How does ordering work?",
      a: (
        <p>
          You browse, add items to your cart, and pay securely online. Most items are then sourced to order from our overseas suppliers and delivered to
          you in Ghana — usually within{" "}
          {content.doorToDoor ? "around 10–12 days" : "around 10–12 days to reach Ghana, plus a short local delivery"}. You&apos;ll get updates at every
          step.
        </p>
      ),
    },
    {
      q: "How long will my order take?",
      a: (
        <p>
          {deliveryTimeSentence()} You&apos;ll see an estimated arrival date on the product page and at checkout, and you can follow your order&apos;s
          progress at any time.
        </p>
      ),
    },
    {
      q: "Why isn't it instant like a shop with stock?",
      a: (
        <p>
          Because we source most items to order, we don&apos;t mark prices up to cover expensive warehouse stock. The short wait is the trade-off for
          better prices and genuine products — and you always know the date to expect.
        </p>
      ),
    },
    {
      q: "How do I pay?",
      a: (
        <p>
          Securely by <strong>Mobile Money (MTN, Telecel, AirtelTigo)</strong> or <strong>card (Visa/Mastercard)</strong>, handled by Paystack. We
          never see or store your card or MoMo details.
        </p>
      ),
    },
    {
      q: "Can I pay on delivery?",
      a: (
        <p>
          No — because each order is sourced specifically for you, payment is made upfront when you order. This is also what lets us keep prices low.
        </p>
      ),
    },
    {
      q: "Where do you deliver?",
      a: (
        <>
          <p>
            Within {listCities(cities)}. The delivery fee is shown clearly at checkout before you pay.
            {pickup.length > 0 && ` Free pickup is available in ${listCities(pickup)} — choose it at checkout.`}
          </p>
          <p>
            Outside Accra? Choose Accra delivery — once your order lands we&apos;ll help you arrange onward transport to your region, paid separately.
            Message us on WhatsApp and we&apos;ll guide you.
          </p>
        </>
      ),
    },
    {
      q: "Do I need an account to order?",
      a: (
        <p>
          No. You can check out as a guest with just your delivery details. You can create an account at the end if you&apos;d like to track orders and
          save your info for next time.
        </p>
      ),
    },
    {
      q: "How do I track my order?",
      a: (
        <p>
          Every order has a tracking timeline showing each stage — from confirmed, to being sourced, to shipped, arrived, and delivered. Signed-in
          customers find it under their <Link href="/account">account</Link>; guests can track at <Link href="/track">Track an order</Link> using their
          order number and email.
        </p>
      ),
    },
    {
      q: "Can I cancel or change an order?",
      a: (
        <p>
          Contact us as soon as possible. If we haven&apos;t yet sourced your item, we can usually cancel or adjust it. Once an item has been sourced
          overseas, options are more limited — see our <Link href="/policies/returns">Returns &amp; Refunds</Link> page.
        </p>
      ),
    },
    {
      q: "Are the products genuine?",
      a: (
        <p>
          Yes. We hand-pick our suppliers and stand behind what we sell. If something arrives faulty, damaged, or not as described, we&apos;ll make it
          right.
        </p>
      ),
    },
    {
      q: "What if my order arrives damaged or wrong?",
      a: (
        <p>
          We&apos;ll sort it out — a replacement or a refund. See <Link href="/policies/returns">Returns &amp; Refunds</Link> for how to make a claim.
        </p>
      ),
    },
  ];

  return (
    <ContentPage path="/faq" title="Frequently asked questions" lead="Everything about ordering, paying, delivery and refunds — in plain words.">
      <div className="max-w-[68ch] divide-y border-y">
        {faqs.map(({ q, a }) => (
          <details key={q} className="group">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 font-heading text-lg font-semibold tracking-tight [&::-webkit-details-marker]:hidden">
              {q}
              <Plus className="size-5 shrink-0 text-brand-700 transition-transform duration-200 group-open:rotate-45" aria-hidden />
            </summary>
            <div className="content-prose pb-5">{a}</div>
          </details>
        ))}
      </div>

      <WhatsAppNudge href={whatsappLink("Hi Ntemtem Deals! I have a question.")}>Didn&apos;t find your answer? Ask us directly.</WhatsAppNudge>
    </ContentPage>
  );
}
