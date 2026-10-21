import type { Metadata } from "next";
import { ContentPage, WhatsAppNudge } from "@/components/store/content-page";
import { content } from "@/lib/content";
import { site, whatsappLink } from "@/lib/site";

export const metadata: Metadata = {
  title: "About us",
  description: "Ntemtem Deals is a curated shop bringing quality products from around the world to Ghana — fairly priced, sourced to order.",
};

export default function AboutPage() {
  return (
    <ContentPage
      path="/about"
      title="About Ntemtem Deals"
      lead="Ntemtem Deals brings you quality products from around the world, delivered right here in Ghana — without the guesswork, the fake listings, or the long waits you've come to expect from buying abroad."
    >
      <div className="content-prose">
        <p>
          We&apos;re a curated shop. Instead of flooding you with thousands of random items, we hand-pick phone and car accessories, home gadgets,
          electronics, fashion and everyday essentials that are genuinely worth owning — and we price them fairly.
        </p>

        <h2>How we&apos;re different</h2>
        <p>
          Here&apos;s the honest part, because it&apos;s what makes our prices work: <strong>most of our products are sourced to order.</strong> When you
          place an order, we buy your item directly from our trusted suppliers overseas and bring it to you in Ghana. That&apos;s why you&apos;ll see a
          delivery window of around 10–12 days on each product — and why we can offer quality goods without marking them up the way a shop holding
          expensive stock has to.
        </p>
        <p>You always know exactly what you&apos;re getting and when. No surprises.</p>

        <h2>Why you can trust us</h2>
        {content.mentionOsika && (
          <p>
            We&apos;re the team behind <strong>Osika Express</strong>, Ghana&apos;s China-to-Ghana shipping service. Moving goods from overseas to your
            door is what we already do every day — Ntemtem Deals is simply that experience, turned into a shop.
          </p>
        )}
        <p>We believe buying online in Ghana should feel safe, simple and premium. That&apos;s what we&apos;ve built.</p>
      </div>

      <div className="mt-12 max-w-[68ch]">
        <span className="ghana-stripe block h-1 w-16 rounded-full" />
        <p className="mt-4 font-heading text-2xl font-semibold tracking-tight">{site.tagline}</p>
      </div>

      <WhatsAppNudge href={whatsappLink("Hi Ntemtem Deals!")}>Looking for something in particular? Ask us — we&apos;re happy to help.</WhatsAppNudge>
    </ContentPage>
  );
}
