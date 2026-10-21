import type { Metadata } from "next";
import { Info } from "lucide-react";
import { ZoneFeeForm } from "@/components/admin/delivery/zone-fee-form";
import { FormSection } from "@/components/admin/form-section";
import { PageHeader } from "@/components/admin/page-header";
import { requireAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Delivery fees" };

export default async function AdminDeliveryPage() {
  await requireAdmin();
  const zones = await prisma.deliveryZone.findMany({ where: { isActive: true }, orderBy: { city: "asc" } });

  return (
    <>
      <PageHeader title="Delivery fees" description="What customers pay for delivery. Changes apply to new orders straight away — orders already placed keep their fee." />

      <div className="grid max-w-3xl gap-6">
        {zones.length === 0 ? (
          <p className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">No delivery city is set up. Customers can&apos;t check out until one is.</p>
        ) : (
          zones.map((z) => (
            <FormSection key={z.id} title={z.city} description="Paid delivery within the city.">
              <ZoneFeeForm zoneId={z.id} city={z.city} fee={z.deliveryFee.toNumber()} />
            </FormSection>
          ))
        )}

        <p className="flex gap-2.5 rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0" />
          <span>
            Customers outside Accra see this at checkout: &ldquo;{site.outsideAccra}&rdquo; To add a free pickup point or another city, ask your
            developer.
          </span>
        </p>
      </div>
    </>
  );
}
