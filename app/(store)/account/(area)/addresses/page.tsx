import type { Metadata } from "next";
import { AddressManager } from "@/components/store/account/address-manager";
import { requireCustomer } from "@/lib/account";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Your addresses" };

export default async function AddressesPage() {
  const customer = await requireCustomer("/account/addresses");
  const [addresses, zones] = await Promise.all([
    prisma.address.findMany({
      // Pickup "addresses" from checkout aren't places we deliver to
      where: { userId: customer.id, NOT: { area: "Free pickup" } },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
      select: { id: true, fullName: true, phone: true, city: true, area: true, landmark: true, isDefault: true },
    }),
    prisma.deliveryZone.findMany({ where: { isActive: true }, orderBy: { city: "asc" }, select: { city: true } }),
  ]);
  return <AddressManager addresses={addresses} cities={zones.map((z) => z.city)} />;
}
