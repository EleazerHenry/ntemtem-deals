import { MapPinned, MessageCircle } from "lucide-react";
import { site, whatsappLink } from "@/lib/site";
import { cn } from "@/lib/utils";

/** "We deliver within Accra. Outside Accra? …" — shown at checkout and on the Delivery page. */
export function OutsideAccraNote({ className }: { className?: string }) {
  const whatsapp = whatsappLink("Hi Ntemtem Deals! I'm outside Accra — can you help me get my order to my region?");
  return (
    <div className={cn("flex gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-4 text-sm", className)}>
      <MapPinned className="mt-0.5 size-5 shrink-0 text-brand-700" />
      <div className="space-y-2">
        <p className="leading-relaxed">{site.outsideAccra}</p>
        {whatsapp && (
          <a href={whatsapp} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-semibold text-brand-800 hover:underline">
            <MessageCircle className="size-4" /> Message us on WhatsApp
          </a>
        )}
      </div>
    </div>
  );
}
