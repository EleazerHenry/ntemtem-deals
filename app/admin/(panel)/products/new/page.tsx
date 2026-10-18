import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/dal";

export const metadata: Metadata = { title: "Add product" };

// Placeholder — the product form lands in Phase 1, Part 2.
export default async function NewProductPage() {
  await requireAdmin();

  return (
    <>
      <PageHeader title="Add product" />
      <div className="rounded-2xl border bg-card px-6 py-16 text-center shadow-soft">
        <p className="font-medium">The product form is coming in the next update.</p>
        <Button asChild variant="outline" className="mt-6">
          <Link href="/admin/products">
            <ArrowLeft data-icon="inline-start" /> Back to products
          </Link>
        </Button>
      </div>
    </>
  );
}
