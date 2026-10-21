import type { Metadata } from "next";
import Link from "next/link";
import { TrackForm } from "@/components/store/orders/track-form";

export const metadata: Metadata = {
  title: "Track your order",
  description: "Check where your Ntemtem Deals order is with your order number and email.",
};

export default function TrackPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:py-20">
      <h1 className="text-3xl font-bold sm:text-4xl">Track your order</h1>
      <p className="mt-2 text-muted-foreground">
        Enter your order number (it&apos;s in your confirmation, like NTD-0012) and the email you ordered with.
      </p>
      <div className="mt-8">
        <TrackForm />
      </div>
      <p className="mt-8 text-center text-sm text-muted-foreground">
        Have an account?{" "}
        <Link href="/account" className="font-semibold text-foreground hover:underline">
          See all your orders
        </Link>
      </p>
    </div>
  );
}
