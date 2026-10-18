import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ProductNotFound() {
  return (
    <div className="rounded-2xl border bg-card px-6 py-16 text-center shadow-soft">
      <h1 className="text-2xl font-semibold">Product not found</h1>
      <p className="mt-2 text-muted-foreground">It may have been deleted.</p>
      <Button asChild variant="outline" className="mt-6">
        <Link href="/admin/products">Back to products</Link>
      </Button>
    </div>
  );
}
