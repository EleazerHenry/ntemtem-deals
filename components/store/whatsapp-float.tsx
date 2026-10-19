"use client";

import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";

/** Floating "chat to order" button — very Ghana commerce. Hidden until a number is set. */
export function WhatsAppFloat({ href }: { href: string | null }) {
  const pathname = usePathname();
  // Product pages have their own WhatsApp button and a phone buy bar this would cover
  if (!href || pathname.startsWith("/products/")) return null;
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
