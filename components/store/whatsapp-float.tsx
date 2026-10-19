import { MessageCircle } from "lucide-react";
import { whatsappLink } from "@/lib/site";

/** Floating "chat to order" button — very Ghana commerce. Hidden until a number is set. */
export function WhatsAppFloat() {
  const href = whatsappLink("Hi Ntemtem Deals! I'd like to order.");
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fixed right-4 bottom-4 z-40 grid size-14 place-items-center rounded-full bg-[#25D366] text-ink shadow-lift transition-transform hover:scale-105 sm:right-6 sm:bottom-6"
    >
      <MessageCircle className="size-7" />
    </a>
  );
}
