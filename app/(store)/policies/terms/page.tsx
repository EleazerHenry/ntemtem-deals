import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "@/components/store/content-page";
import { content } from "@/lib/content";
import { site, whatsappLink } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms & conditions",
  description: "The terms for using the Ntemtem Deals website and placing an order.",
};

export default function TermsPage() {
  const whatsapp = whatsappLink();

  return (
    <ContentPage
      path="/policies/terms"
      title="Terms & Conditions"
      lead="Welcome to Ntemtem Deals. By using this website and placing an order, you agree to the terms below. Please read them carefully."
    >
      <div className="content-prose">
        <h2 className="!mt-0">1. About us</h2>
        <p>
          Ntemtem Deals (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) is an online shop delivering products to customers in Ghana.
        </p>
        <p>
          Ntemtem Deals is a trading name operated by {content.operator.name}, registered in Ghana under the Registration of Business Names Act, 1962
          (Reg. No. {content.operator.regNo}).
        </p>

        <h2>2. Products</h2>
        <p>
          We show our products as accurately as we can, including photos and descriptions. Colours and small details may vary slightly from images.
          Because most items are sourced to order, availability can change, and we may decline or cancel an order and refund you in full if we&apos;re
          unable to source an item.
        </p>

        <h2>3. Prices and payment</h2>
        <p>
          All prices are in Ghana Cedis (GH₵) and include any applicable taxes unless stated. Delivery fees are shown at checkout. Payment is made
          upfront, securely, by Mobile Money or card through our payment partner, Paystack. Your order is confirmed once payment is received.
        </p>

        <h2>4. Pre-order and delivery estimates</h2>
        <p>
          Most items are sourced to order from overseas suppliers. Delivery dates shown are good-faith estimates,{" "}
          typically around 10–12 days from payment to arrival in Accra, and may
          occasionally change due to shipping or customs. We&apos;ll keep you informed and deliver as quickly as we can.
        </p>

        <h2>5. Cancellations, returns and refunds</h2>
        <p>
          Cancellations, returns and refunds are handled as set out on our <Link href="/policies/returns">Returns &amp; Refunds</Link> page, which forms
          part of these terms.
        </p>

        <h2>6. Your account and information</h2>
        <p>
          If you create an account, you&apos;re responsible for keeping your login details secure. You agree to give accurate delivery and contact
          information so we can fulfil your order.
        </p>

        <h2>7. Acceptable use</h2>
        <p>You agree not to misuse the site, attempt fraudulent orders, or use it for any unlawful purpose.</p>

        <h2>8. Our liability</h2>
        <p>
          We take care to deliver quality products and a reliable service. To the extent permitted by law, our responsibility for any order is limited
          to the value of that order.
        </p>

        <h2>9. Governing law</h2>
        <p>These terms are governed by the laws of Ghana.</p>

        <h2>10. Contact</h2>
        <p>
          Questions about these terms? Reach us{" "}
          {site.email ? (
            <>
              at <a href={`mailto:${site.email}`}>{site.email}</a>
              {whatsapp && (
                <>
                  {" "}
                  or on{" "}
                  <a href={whatsapp} target="_blank" rel="noreferrer">
                    WhatsApp
                  </a>
                </>
              )}
            </>
          ) : whatsapp ? (
            <>
              on{" "}
              <a href={whatsapp} target="_blank" rel="noreferrer">
                WhatsApp
              </a>
            </>
          ) : (
            <>
              through our <Link href="/contact">Contact</Link> page
            </>
          )}
          .
        </p>

        <p className="!mt-10 text-sm text-muted-foreground">
          <em>Last updated: {content.termsUpdated}</em>
        </p>
      </div>
    </ContentPage>
  );
}
