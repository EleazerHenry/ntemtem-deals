import { StoreFooter } from "@/components/store/store-footer";
import { StoreHeader } from "@/components/store/store-header";
import { WhatsAppFloat } from "@/components/store/whatsapp-float";
import { getStoreCategories } from "@/lib/storefront";

// Pages are built once and refreshed when the owner edits products or
// categories (revalidatePath in the admin actions); this is just a backstop.
export const revalidate = 600;

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const categories = await getStoreCategories();

  return (
    <>
      <StoreHeader categories={categories} />
      <main className="flex-1">{children}</main>
      <StoreFooter categories={categories} />
      <WhatsAppFloat />
    </>
  );
}
