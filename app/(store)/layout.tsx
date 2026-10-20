import { CartProvider } from "@/components/store/cart/cart-provider";
import { StoreFooter } from "@/components/store/store-footer";
import { StoreHeader } from "@/components/store/store-header";
import { WhatsAppFloat } from "@/components/store/whatsapp-float";
import { whatsappLink } from "@/lib/site";
import { getStoreCategories } from "@/lib/storefront";

// Pages are built once and refreshed when the owner edits products or
// categories (revalidatePath in the admin actions); this is just a backstop.
export const revalidate = 600;

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  // Only categories with something to buy appear in the header, menu and footer
  const categories = (await getStoreCategories()).filter((c) => c.productCount > 0);

  return (
    <CartProvider>
      <StoreHeader categories={categories} />
      <main className="flex-1">{children}</main>
      <StoreFooter categories={categories} />
      <WhatsAppFloat href={whatsappLink("Hi Ntemtem Deals! I'd like to order.")} />
    </CartProvider>
  );
}
