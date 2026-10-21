// Storefront-wide details. WhatsApp and email come from lib/content.ts (env can
// override); social links come from env; anything missing is simply hidden.

import { content } from "@/lib/content";

const digits = (v?: string) => v?.replace(/\D/g, "") || null;

export const site = {
  name: "Ntemtem Deals",
  tagline: "Fast Deals • Quality Products • To Ghana",
  description:
    "Quality phone accessories, car accessories, home gadgets, fashion and electronics — sourced for you and delivered in Accra in 10–12 days.",
  domain: "ntemtemdeals.com",
  deliveryDays: "10-12 days",
  /** Where we deliver. Everyone else picks Accra delivery and we help with onward transport. */
  cities: ["Accra"],
  outsideAccra:
    "We deliver within Accra. Outside Accra? Choose Accra delivery — once your order lands we'll help you arrange onward transport to your region, paid separately. Message us on WhatsApp and we'll guide you.",
  /** International format without "+", e.g. 8619835265530 (for wa.me links) */
  whatsapp: digits(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || content.whatsapp),
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || content.email || null,
  socials: [
    { label: "Instagram", href: process.env.NEXT_PUBLIC_INSTAGRAM_URL },
    { label: "TikTok", href: process.env.NEXT_PUBLIC_TIKTOK_URL },
    { label: "Facebook", href: process.env.NEXT_PUBLIC_FACEBOOK_URL },
  ].filter((s): s is { label: string; href: string } => !!s.href),
  policies: [
    { label: "Delivery", href: "/policies/delivery" },
    { label: "Returns & refunds", href: "/policies/returns" },
    { label: "Terms", href: "/policies/terms" },
    { label: "Privacy", href: "/policies/privacy" },
  ],
  help: [
    { label: "Track an order", href: "/track" },
    { label: "About us", href: "/about" },
    { label: "Contact", href: "/contact" },
    { label: "FAQ", href: "/faq" },
  ],
} as const;

export function whatsappLink(message?: string) {
  if (!site.whatsapp) return null;
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${site.whatsapp}${text}`;
}
