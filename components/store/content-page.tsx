import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const PAGES = [
  { label: "About us", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "FAQ", href: "/faq" },
  { label: "Delivery", href: "/policies/delivery" },
  { label: "Returns & refunds", href: "/policies/returns" },
  { label: "Terms", href: "/policies/terms" },
  { label: "Track an order", href: "/track" },
];

/** Shell for About, Contact, FAQ and the policies: readable column + the other help pages. */
export function ContentPage({
  path,
  title,
  lead,
  children,
}: {
  /** This page's href, to mark it in the menu */
  path: string;
  title: string;
  lead?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 pb-20 sm:px-8 sm:pt-14">
      <div className="lg:grid lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-16">
        <nav aria-label="Help pages" className="hidden lg:block">
          <ul className="sticky top-36 space-y-0.5 border-l text-sm">
            {PAGES.map((p) => (
              <li key={p.href}>
                <Link
                  href={p.href}
                  aria-current={p.href === path ? "page" : undefined}
                  className={cn(
                    "-ml-px block border-l-2 py-1.5 pl-4 transition-colors",
                    p.href === path ? "border-brand-500 font-semibold text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  {p.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <article>
          <header className="mb-10 max-w-[68ch] border-b pb-8">
            <h1 className="text-4xl font-bold sm:text-5xl">{title}</h1>
            {lead && <div className="mt-4 text-lg leading-relaxed text-muted-foreground">{lead}</div>}
          </header>
          {children}
        </article>
      </div>

      <nav aria-label="More help" className="mt-16 border-t pt-8 lg:hidden">
        <h2 className="mb-3 font-sans text-sm font-semibold tracking-normal text-muted-foreground">More help</h2>
        <ul className="divide-y rounded-2xl border bg-card">
          {PAGES.filter((p) => p.href !== path).map((p) => (
            <li key={p.href}>
              <Link href={p.href} className="flex min-h-12 items-center justify-between px-4 text-[0.95rem] font-medium">
                {p.label} <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

/** "Chat to us on WhatsApp" box that closes most pages; hidden until the number is set. */
export function WhatsAppNudge({ href, children }: { href: string | null; children: React.ReactNode }) {
  if (!href) return null;
  return (
    <aside className="mt-14 flex max-w-[68ch] flex-col items-start gap-4 rounded-3xl bg-ink p-6 text-paper sm:flex-row sm:items-center sm:justify-between sm:p-7">
      <p className="text-paper/85">{children}</p>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="inline-flex h-11 shrink-0 items-center rounded-xl bg-brand-500 px-5 text-sm font-semibold text-ink transition-colors hover:bg-brand-400"
      >
        Chat on WhatsApp
      </a>
    </aside>
  );
}

