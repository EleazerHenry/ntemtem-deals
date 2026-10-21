import type { Metadata } from "next";
import { ContentPage, WhatsAppNudge } from "@/components/store/content-page";
import { content } from "@/lib/content";
import { whatsappLink } from "@/lib/site";

export const metadata: Metadata = {
  title: "Returns & refunds",
  description: "When Ntemtem Deals offers a replacement or a full refund, how to make a claim, and how refunds are paid.",
};

export default function ReturnsPage() {
  return (
    <ContentPage
      path="/policies/returns"
      title="Returns & Refunds"
      lead="We want you to be happy with what you receive. Because most of our items are sourced to order especially for you, please read how returns work below."
    >
      <div className="content-prose">
        <h2 className="!mt-0">When you&apos;re covered</h2>
        <p>
          We&apos;ll offer a <strong>replacement or a full refund</strong> if your order:
        </p>
        <ul>
          <li>doesn&apos;t arrive,</li>
          <li>arrives damaged or faulty, or</li>
          <li>is clearly not what was described or ordered.</li>
        </ul>
        <p>We can&apos;t cover damage that happens during onward delivery outside Accra.</p>

        <h2>Change of mind</h2>
        <p>
          Because each item is bought specifically for your order, we&apos;re usually unable to accept returns simply for a change of mind once an item
          has been sourced. If you&apos;re unsure about a purchase, message us before ordering and we&apos;ll help.
        </p>

        <h2>How to make a claim</h2>
        <p>
          Contact us on WhatsApp or by email <strong>within {content.claimWindow} of delivery</strong>, with your order number and a photo if the item is
          damaged or faulty. We&apos;ll respond quickly and sort it out.
        </p>

        <h2>How refunds are paid</h2>
        <p>
          Approved refunds are paid back to your original payment method — your Mobile Money wallet or card — within {content.refundTime}.
        </p>

        <h2>Cancellations</h2>
        <p>
          If you need to cancel, contact us as soon as possible. If we haven&apos;t yet sourced your item, we can usually cancel and refund you in full.
          Once an item has been sourced overseas, cancellation may not be possible.
        </p>
      </div>

      <WhatsAppNudge href={whatsappLink("Hi Ntemtem Deals! I need help with an order.")}>
        Problem with an order? Send us your order number and a photo.
      </WhatsAppNudge>
    </ContentPage>
  );
}
