import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function OrderNotFound() {
  return (
    <div className="rounded-2xl border bg-card px-6 py-16 text-center shadow-soft">
      <h1 className="text-2xl font-semibold">Order not found</h1>
      <p className="mt-2 text-muted-foreground">Check the order number and try again.</p>
      <Button asChild variant="outline" className="mt-6">
        <Link href="/admin/orders">Back to orders</Link>
      </Button>
    </div>
  );
}
