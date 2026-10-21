import { ADMIN_STEP, type OrderStatusValue } from "@/lib/order-status";
import { cn } from "@/lib/utils";

const TONE: Record<OrderStatusValue, string> = {
  PENDING: "bg-muted text-muted-foreground",
  CONFIRMED: "bg-brand-500 text-ink", // paid — the owner's move next
  SOURCING: "bg-brand-100 text-brand-800",
  SHIPPED: "bg-ink text-paper",
  ARRIVED: "bg-ghana-gold text-ink",
  DELIVERED: "bg-success/10 text-success",
  CANCELLED: "bg-destructive/10 text-destructive",
};

export function OrderStatusBadge({ status, className }: { status: OrderStatusValue; className?: string }) {
  return (
    <span className={cn("inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold whitespace-nowrap", TONE[status], className)}>
      {ADMIN_STEP[status].label}
    </span>
  );
}
