import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

// Placeholder — the checkout itself lands in Phase 3, Part 2.
export default function CheckoutPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="eyebrow text-brand-700">Almost there</p>
      <h1 className="mt-2 text-3xl font-bold">Checkout opens very soon</h1>
      <p className="mt-2 text-muted-foreground">Your cart is saved — it&apos;ll be right here when checkout goes live.</p>
      <Button asChild size="lg" variant="secondary" className="mt-6">
        <Link href="/shop">Keep shopping</Link>
      </Button>
    </div>
  );
}
