import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function OrderNotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-3xl font-bold">We couldn&apos;t open that order</h1>
      <p className="mt-2 text-muted-foreground">Use the full link from your order confirmation. If you think something&apos;s wrong, contact us with your order number.</p>
      <Button asChild size="lg" className="mt-6">
        <Link href="/shop">Back to the shop</Link>
      </Button>
    </div>
  );
}
