import { Check, CircleX, CreditCard, Home, MapPin, PackageSearch, Plane, Receipt } from "lucide-react";
import { ORDER_FLOW, STEP_COPY, isInternalNote, stepIndex, type FlowStatus, type OrderStatusValue } from "@/lib/order-status";
import { cn } from "@/lib/utils";

const ICONS: Record<FlowStatus, React.ComponentType<{ className?: string }>> = {
  PENDING: Receipt,
  CONFIRMED: CreditCard,
  SOURCING: PackageSearch,
  SHIPPED: Plane,
  ARRIVED: MapPin,
  DELIVERED: Home,
};

const dayMonth = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "Africa/Accra" });
const whenFmt = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Africa/Accra" });
const DAY = 86_400_000;

export type TrackerHistory = { status: OrderStatusValue; note: string | null; createdAt: Date };

/**
 * The customer's view of an order's journey: a plain-words headline with an
 * arrival window, a route bar, and every step with its date, note or what to expect.
 */
export function OrderTracker({
  status,
  history,
  deliveryCity,
  pickup,
  deliveryDays,
}: {
  status: OrderStatusValue;
  history: TrackerHistory[];
  deliveryCity: string;
  pickup: boolean;
  /** Zone estimate after arrival, e.g. "1-2 days" */
  deliveryDays?: string;
}) {
  const visible = history.filter((h) => !isInternalNote(h.note));
  const current = stepIndex(status);
  const latest = (s: OrderStatusValue) => [...visible].reverse().find((h) => h.status === s);
  const paidAt = latest("CONFIRMED")?.createdAt;
  const deliveredAt = latest("DELIVERED")?.createdAt;

  if (status === "CANCELLED") {
    const note = latest("CANCELLED")?.note;
    return (
      <section className="rounded-3xl border border-destructive/30 bg-card p-6 sm:p-8">
        <div className="flex gap-4">
          <CircleX className="size-8 shrink-0 text-destructive" />
          <div>
            <h2 className="text-2xl font-semibold">This order was cancelled</h2>
            <p className="mt-1 text-muted-foreground">{note ?? "If you paid, your refund is handled separately — contact us with your order number if you have questions."}</p>
          </div>
        </div>
      </section>
    );
  }

  const step = ORDER_FLOW[current];
  const copy = STEP_COPY[step];
  const eta =
    status === "DELIVERED"
      ? deliveredAt && `Delivered ${dayMonth.format(deliveredAt)}`
      : paidAt
        ? `Expected around ${dayMonth.format(new Date(paidAt.getTime() + 10 * DAY))} – ${dayMonth.format(new Date(paidAt.getTime() + 12 * DAY))}`
        : "Arrives 10–12 days after payment";
  const now =
    status === "ARRIVED"
      ? pickup
        ? `It's here! We'll call or WhatsApp you when it's ready to pick up in ${deliveryCity}.`
        : `It's here! Delivery to you in ${deliveryCity} usually takes ${deliveryDays ?? "1–2 days"}.`
      : copy.now;

  return (
    <section aria-labelledby="tracker-title" className="overflow-hidden rounded-3xl border bg-card shadow-soft">
      {/* Where it is, in plain words */}
      <div className="relative isolate overflow-hidden bg-ink px-6 pt-7 pb-8 text-paper sm:px-8">
        <div aria-hidden className="absolute -top-20 -right-16 -z-10 size-64 rounded-full bg-brand-500/25 blur-3xl" />
        <p className="text-sm font-medium text-brand-400">{eta}</p>
        <h2 id="tracker-title" className="mt-1.5 text-3xl leading-tight font-bold sm:text-4xl">
          {copy.headline}
        </h2>
        <p className="mt-2 max-w-xl text-paper/70">{now}</p>

        {/* Route: supplier → Ghana → you */}
        <ol className="relative mt-8 grid grid-cols-6" aria-label="Order progress">
          <span aria-hidden className="absolute top-4 right-[8.33%] left-[8.33%] h-1 rounded-full bg-paper/15 sm:top-[18px]" />
          <span
            aria-hidden
            className="absolute top-4 left-[8.33%] h-1 rounded-full bg-success transition-[width] duration-700 sm:top-[18px]"
            style={{ width: `${(current / (ORDER_FLOW.length - 1)) * 83.34}%` }}
          />
          {ORDER_FLOW.map((s, i) => {
            const Icon = ICONS[s];
            const done = i < current || status === "DELIVERED";
            const isNow = i === current && status !== "DELIVERED";
            return (
              <li key={s} className="relative flex flex-col items-center gap-2 text-center" aria-current={isNow ? "step" : undefined}>
                <span className="relative grid size-9 place-items-center sm:size-10">
                  {isNow && <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-brand-500/40 motion-reduce:hidden" />}
                  <span
                    className={cn(
                      "relative grid size-9 place-items-center rounded-full border-2 sm:size-10",
                      done && "border-success bg-success text-success-foreground",
                      isNow && "border-brand-500 bg-brand-500 text-ink",
                      !done && !isNow && "border-paper/20 bg-ink text-paper/40",
                    )}
                  >
                    {done ? <Check className="size-4" strokeWidth={3} /> : <Icon className="size-4" />}
                  </span>
                </span>
                {/* Phones: only the current stop is labelled (the list below names them all) */}
                <span
                  className={cn(
                    "text-[0.7rem] leading-tight font-medium whitespace-nowrap sm:text-xs",
                    done || isNow ? "text-paper" : "text-paper/45",
                    !isNow && "sr-only sm:not-sr-only",
                  )}
                >
                  {STEP_COPY[s].short}
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Every step: when it happened, or what to expect */}
      <ol className="px-6 py-6 sm:px-8">
        {ORDER_FLOW.map((s, i) => {
          const entry = latest(s);
          const done = i < current || status === "DELIVERED";
          const isNow = i === current && status !== "DELIVERED";
          const notes = visible.filter((h) => h.status === s && h.note).map((h) => h.note!);
          return (
            <li key={s} className="relative flex gap-4 pb-6 last:pb-0">
              {i < ORDER_FLOW.length - 1 && (
                <span aria-hidden className={cn("absolute top-8 bottom-1 left-[13px] w-0.5", i < current ? "bg-success" : "bg-border")} />
              )}
              <span
                className={cn(
                  "relative mt-0.5 grid size-7 shrink-0 place-items-center rounded-full",
                  i < current || status === "DELIVERED" ? "bg-success text-success-foreground" : isNow ? "bg-brand-500 text-ink" : "bg-muted text-muted-foreground",
                )}
              >
                {i < current || status === "DELIVERED" ? <Check className="size-3.5" strokeWidth={3} /> : <span className="size-2 rounded-full bg-current" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <p className={cn("font-semibold", !done && !isNow && "text-muted-foreground")}>{STEP_COPY[s].title}</p>
                  {entry && (i <= current || status === "DELIVERED") && (
                    <time dateTime={entry.createdAt.toISOString()} className="text-xs text-muted-foreground">
                      {whenFmt.format(entry.createdAt)}
                    </time>
                  )}
                </div>
                {notes.length > 0 && (i <= current || status === "DELIVERED")
                  ? notes.map((n, k) => (
                      <p key={k} className="mt-0.5 text-sm text-muted-foreground">
                        {n}
                      </p>
                    ))
                  : i > current && <p className="mt-0.5 text-sm text-muted-foreground">{STEP_COPY[s].expect}</p>}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
