import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { PaymentMarks } from "@/components/store/payment-marks";
import { site, whatsappLink } from "@/lib/site";
import type { StoreCategory } from "@/lib/storefront";

export function StoreFooter({ categories }: { categories: StoreCategory[] }) {
  const whatsapp = whatsappLink("Hi Ntemtem Deals!");
  const year = new Date().getFullYear();

  return (
    <footer className="mt-24 bg-ink text-paper">
      <div className="ghana-stripe h-1" />
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-14 sm:px-8 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="max-w-sm space-y-5">
          <Logo tone="light" />
          <p className="text-sm leading-relaxed text-paper/65">{site.description}</p>
          <p className="text-sm font-medium text-paper/80">From the team behind Osika Express.</p>
          {whatsapp && (
            <a
              href={whatsapp}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-2.5 text-sm font-semibold text-ink transition-transform hover:-translate-y-0.5"
            >
              <MessageCircle className="size-4" /> Chat on WhatsApp
            </a>
          )}
          {site.socials.length > 0 && (
            <ul className="flex gap-4 text-sm">
              {site.socials.map((s) => (
                <li key={s.label}>
                  <a href={s.href} target="_blank" rel="noreferrer" className="text-paper/70 hover:text-paper">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <FooterColumn
          title="Shop"
          links={[
            { label: "All products", href: "/shop" },
            ...categories.slice(0, 6).map((c) => ({ label: c.name, href: `/categories/${c.slug}` })),
          ]}
        />
        <FooterColumn title="Help" links={site.help} />
        <FooterColumn title="Policies" links={site.policies} />
      </div>

      <div className="border-t border-paper/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-xs text-paper/50 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>
            © {year} {site.name}. {site.tagline}
          </p>
          <div className="flex flex-col gap-2 sm:items-end">
            <PaymentMarks />
            <p>Pay securely with Mobile Money or card · Delivered in Accra</p>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: readonly { label: string; href: string }[] }) {
  return (
    <div>
      <p className="eyebrow mb-4 text-[0.7rem] text-paper/45">{title}</p>
      <ul className="space-y-2.5 text-sm">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="text-paper/75 transition-colors hover:text-brand-400">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
