import type { Metadata } from "next";
import { Clock, Mail, MessageCircle, Phone } from "lucide-react";
import { ContentPage, WhatsAppNudge } from "@/components/store/content-page";
import { content } from "@/lib/content";
import { formatPhone } from "@/lib/format";
import { site, whatsappLink } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact us",
  description: "Questions about a product, your order, or something you'd like us to source? Reach Ntemtem Deals on WhatsApp, email or phone.",
};

type Channel = { icon: typeof Mail; label: string; value: string; href?: string; note?: string };

export default function ContactPage() {
  const whatsapp = whatsappLink("Hi Ntemtem Deals!");
  // Only the details the client has given us are shown
  const channels = ([
    whatsapp && {
      icon: MessageCircle,
      label: "WhatsApp",
      value: formatPhone(`+${site.whatsapp}`),
      href: whatsapp,
      note: "The fastest way to reach us. Tap the green button on any page to chat.",
    },
    site.email && { icon: Mail, label: "Email", value: site.email, href: `mailto:${site.email}` },
    content.phone && { icon: Phone, label: "Phone / Call", value: content.phone, href: `tel:${content.phone.replace(/\s/g, "")}` },
    content.hours && { icon: Clock, label: "Hours", value: content.hours },
  ] as (Channel | null | "" | undefined)[]).filter((c): c is Channel => !!c);

  return (
    <ContentPage
      path="/contact"
      title="Get in touch"
      lead="Questions about a product, your order, or something you'd like us to source for you? We're happy to help."
    >
      {channels.length ? (
        <ul className="grid max-w-[68ch] gap-3 sm:grid-cols-2">
          {channels.map(({ icon: Icon, label, value, href, note }) => (
            <li key={label} className="rounded-2xl border bg-card p-5 shadow-soft">
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Icon className="size-4 text-brand-700" /> {label}
              </p>
              {href ? (
                <a
                  href={href}
                  target={href.startsWith("http") ? "_blank" : undefined}
                  rel="noreferrer"
                  className="mt-1 block font-heading text-xl font-semibold break-words hover:text-brand-700"
                >
                  {value}
                </a>
              ) : (
                <p className="mt-1 font-heading text-xl font-semibold">{value}</p>
              )}
              {note && <p className="mt-1.5 text-sm text-muted-foreground">{note}</p>}
            </li>
          ))}
        </ul>
      ) : (
        <p className="max-w-[68ch] rounded-2xl border bg-card p-5 text-muted-foreground shadow-soft">
          Our phone, WhatsApp and email details are being set up and will appear here shortly. To check on an order in the meantime, use{" "}
          <a href="/track" className="font-medium text-brand-700 underline underline-offset-4">
            Track an order
          </a>
          .
        </p>
      )}

      {site.socials.length > 0 && (
        <p className="mt-6 max-w-[68ch] text-[1.0625rem]">
          <strong className="font-semibold">Find us on social:</strong>{" "}
          {site.socials.map((s, i) => (
            <span key={s.label}>
              {i > 0 && ", "}
              <a href={s.href} target="_blank" rel="noreferrer" className="font-medium text-brand-700 underline decoration-brand-300 underline-offset-4">
                {s.label}
              </a>
            </span>
          ))}
        </p>
      )}

      <div className="content-prose">
        <h2>Want something we don&apos;t list?</h2>
        <p>
          If there&apos;s a product you&apos;re after that isn&apos;t in the shop yet, message us on WhatsApp with a photo or a link. If we can source it,
          we&apos;ll give you a price and a delivery estimate.
        </p>

        <h2>Prefer to order by chat?</h2>
        <p>
          You can. Send us the product and your details on WhatsApp and we&apos;ll set up your order for you — same prices, same delivery promise.
        </p>
      </div>

      <WhatsAppNudge href={whatsapp}>Send us a photo or a link — we&apos;ll reply with a price and a delivery date.</WhatsAppNudge>
    </ContentPage>
  );
}
