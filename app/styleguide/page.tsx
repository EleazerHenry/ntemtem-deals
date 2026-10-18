import type { Metadata } from "next";
import { ArrowRight, Clock, MessageCircle, ShoppingBag, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatGHS } from "@/lib/format";

export const metadata: Metadata = {
  title: "Design system",
  robots: { index: false },
};

const brandScale = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

const statuses = [
  { label: "Pending", className: "bg-muted text-muted-foreground" },
  { label: "Confirmed", className: "bg-brand-100 text-brand-800" },
  { label: "Sourcing", className: "bg-brand-500 text-ink" },
  { label: "Shipped", className: "bg-ink text-paper" },
  { label: "Arrived", className: "bg-ghana-gold text-ink" },
  { label: "Delivered", className: "bg-success text-success-foreground" },
  { label: "Cancelled", className: "bg-destructive/10 text-destructive" },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-5 border-t pt-10">
      <h2 className="text-2xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export default function StyleguidePage() {
  return (
    <main className="flex-1">
      <div className="ghana-stripe h-1" />
      <div className="mx-auto max-w-6xl space-y-14 px-4 py-14 sm:px-8">
        <header className="space-y-3">
          <p className="eyebrow text-brand-700">Ntemtem Deals · Foundation</p>
          <h1 className="text-5xl font-bold sm:text-6xl">Design system</h1>
          <p className="max-w-2xl text-lg text-muted-foreground">
            Orange carries ink text, never white — white on #F7941D is only 2.3:1. Orange as
            text uses brand-700. Ghana colours are accents, not surfaces.
          </p>
        </header>

        <Section title="Colour">
          <div className="grid grid-cols-6 overflow-hidden rounded-xl sm:grid-cols-11">
            {brandScale.map((step) => (
              <div key={step} className="flex h-24 items-end p-2" style={{ background: `var(--color-brand-${step})` }}>
                <span className={`numeric text-xs font-medium ${step >= 700 ? "text-paper" : "text-ink"}`}>{step}</span>
              </div>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            {[
              ["Ink", "bg-ink text-paper", "#1A1A1A"],
              ["Ghana red", "bg-ghana-red text-paper", "#CE1126"],
              ["Ghana gold", "bg-ghana-gold text-ink", "#FCD116"],
              ["Ghana green", "bg-ghana-green text-paper", "#006B3F"],
            ].map(([name, cls, hex]) => (
              <div key={name} className={`rounded-xl p-4 ${cls}`}>
                <p className="font-semibold">{name}</p>
                <p className="numeric text-sm opacity-80">{hex}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Typography">
          <div className="space-y-4">
            <p className="text-6xl font-bold">Deals that land.</p>
            <p className="text-4xl font-semibold">Bricolage Grotesque — display</p>
            <p className="text-2xl font-medium">Headings, prices and big moments</p>
            <p className="max-w-2xl text-base leading-relaxed">
              Plus Jakarta Sans — body. Every item is sourced for you after you order and delivered
              across Accra, Kumasi, Cape Coast and Takoradi within 10-12 days.
            </p>
            <p className="numeric font-heading text-3xl font-semibold">{formatGHS(1250)}</p>
          </div>
        </Section>

        <Section title="Buttons">
          <div className="flex flex-wrap items-center gap-3">
            <Button size="xl">
              Add to cart <ShoppingBag data-icon="inline-end" />
            </Button>
            <Button size="xl" variant="secondary">
              Checkout <ArrowRight data-icon="inline-end" />
            </Button>
            <Button size="xl" variant="outline">
              <MessageCircle data-icon="inline-start" /> Chat to order
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button>Primary</Button>
            <Button variant="secondary">Ink</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Delete</Button>
            <Button variant="link">Link</Button>
          </div>
        </Section>

        <Section title="Product card">
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              { name: "Magnetic Wireless Car Charger", price: 245, was: 320 },
              { name: "Smart LED Desk Lamp", price: 189, was: null },
              { name: "65W GaN Fast Charger", price: 159, was: 210 },
            ].map((p) => (
              <Card
                key={p.name}
                className="group gap-0 overflow-hidden p-0 shadow-soft transition-all duration-300 ease-out-expo hover:-translate-y-1 hover:shadow-lift"
              >
                <div className="relative aspect-square bg-linear-to-br from-brand-50 to-brand-100">
                  <div className="absolute left-3 top-3 flex gap-1.5">
                    {p.was && <Badge className="bg-ghana-red text-paper">-{Math.round((1 - p.price / p.was) * 100)}%</Badge>}
                    <Badge variant="outline" className="bg-card/90 backdrop-blur">
                      <Clock /> Pre-order
                    </Badge>
                  </div>
                </div>
                <CardContent className="space-y-2 p-4">
                  <h3 className="font-sans text-base font-medium leading-snug">{p.name}</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="numeric font-heading text-xl font-semibold">{formatGHS(p.price)}</span>
                    {p.was && <span className="numeric text-sm text-muted-foreground line-through">{formatGHS(p.was)}</span>}
                  </div>
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Truck className="size-3.5" /> Delivered in 10-12 days
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </Section>

        <Section title="Order status">
          <div className="flex flex-wrap gap-2">
            {statuses.map((s) => (
              <Badge key={s.label} className={`h-7 px-3 text-sm ${s.className}`}>
                {s.label}
              </Badge>
            ))}
          </div>
        </Section>

        <Section title="Form">
          <div className="grid max-w-md gap-2">
            <Label htmlFor="landmark">Landmark</Label>
            <Input id="landmark" placeholder="Near the blue kiosk, opposite Total filling station" className="h-11" />
            <p className="text-sm text-muted-foreground">Helps our rider find you faster.</p>
          </div>
        </Section>
      </div>
    </main>
  );
}
