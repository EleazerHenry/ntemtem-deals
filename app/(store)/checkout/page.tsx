import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { CheckoutForm } from "@/components/store/checkout/checkout-form";
import { authOptions } from "@/lib/auth";
import { getDeliveryZones } from "@/lib/checkout";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage() {
  const [zones, session] = await Promise.all([getDeliveryZones(), getServerSession(authOptions)]);
  const user = session?.user?.id
    ? await prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true, email: true, phone: true } })
    : null;

  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 pb-16 sm:px-8 sm:pt-10">
      <h1 className="mb-8 text-3xl font-bold sm:text-4xl">Checkout</h1>
      <CheckoutForm
        zones={zones}
        signedIn={!!user}
        prefill={{ fullName: user?.name ?? "", email: user?.email ?? "", phone: user?.phone ?? "" }}
      />
    </div>
  );
}
