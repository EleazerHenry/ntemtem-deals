import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ProductNotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="eyebrow text-brand-700">Not found</p>
      <h1 className="mt-2 text-3xl font-bold">This product isn&apos;t available</h1>
      <p className="mt-2 text-muted-foreground">It may have sold out or been removed. There&apos;s plenty more to see.</p>
      <Button asChild size="lg" className="mt-6">
        <Link href="/shop">Browse all products</Link>
      </Button>
    </div>
  );
}
