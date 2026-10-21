import { cn } from "@/lib/utils";

// Small acceptance marks for how customers can pay (all through Paystack).
// Drawn in each network's colours so they read at a glance; swap in the
// official logo files here if the client gets them (e.g. from Paystack).

function Chip({ className, children, label }: { className?: string; children: React.ReactNode; label: string }) {
  return (
    <li
      aria-label={label}
      className={cn("flex h-7 items-center rounded-md border border-black/10 px-2 text-[0.7rem] leading-none font-extrabold tracking-tight whitespace-nowrap", className)}
    >
      {children}
    </li>
  );
}

export function PaymentMarks({ className }: { className?: string }) {
  return (
    <ul aria-label="Ways to pay" className={cn("flex flex-wrap items-center gap-1.5", className)}>
      <Chip label="MTN Mobile Money" className="bg-[#FFCB05] text-[#1A1A1A]">
        MTN MoMo
      </Chip>
      <Chip label="Telecel Cash" className="bg-[#E30613] text-white">
        Telecel
      </Chip>
      <Chip label="AirtelTigo Money" className="bg-white">
        <span className="text-[#E40000]">Airtel</span>
        <span className="text-[#00559F]">Tigo</span>
      </Chip>
      <Chip label="Visa" className="bg-white text-[0.8rem] text-[#1A1F71] italic">
        VISA
      </Chip>
      <Chip label="Mastercard" className="bg-white px-1.5">
        <svg viewBox="0 0 32 20" className="h-4 w-auto" aria-hidden>
          <circle cx="11" cy="10" r="9" fill="#EB001B" />
          <circle cx="21" cy="10" r="9" fill="#F79E1B" />
          <path d="M16 2.6a9 9 0 0 1 0 14.8 9 9 0 0 1 0-14.8z" fill="#FF5F00" />
        </svg>
      </Chip>
    </ul>
  );
}

/** "From the team behind Osika Express." — the client approved showing it. */
export function OsikaLine({ className }: { className?: string }) {
  return <p className={cn("text-xs text-muted-foreground", className)}>From the team behind Osika Express.</p>;
}
