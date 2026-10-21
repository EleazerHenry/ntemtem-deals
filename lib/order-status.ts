// The order journey in one place: customer wording, admin wording, what comes next.
// Client-safe (no server imports).

export const ORDER_FLOW = ["PENDING", "CONFIRMED", "SOURCING", "SHIPPED", "ARRIVED", "DELIVERED"] as const;
export type FlowStatus = (typeof ORDER_FLOW)[number];
export type OrderStatusValue = FlowStatus | "CANCELLED";

type StepCopy = {
  /** Short label on the journey bar */
  short: string;
  /** Step title in the timeline */
  title: string;
  /** Big headline while this is the current step */
  headline: string;
  /** What's happening now / next, while current */
  now: string;
  /** Shown on upcoming steps: when to expect it */
  expect: string;
};

export const STEP_COPY: Record<FlowStatus, StepCopy> = {
  PENDING: {
    short: "Placed",
    title: "Order placed",
    headline: "Waiting for your payment",
    now: "Pay for your order and we'll start sourcing it straight away.",
    expect: "",
  },
  CONFIRMED: {
    short: "Paid",
    title: "Payment received",
    headline: "Paid — we're getting it ready",
    now: "We'll buy your items from our supplier within 1–2 days and check them before they ship.",
    expect: "As soon as you pay",
  },
  SOURCING: {
    short: "Sourcing",
    title: "Being sourced",
    headline: "Being sourced from our supplier",
    now: "We're buying your items and checking them before they're packed for Ghana.",
    expect: "Usually 1–2 days after payment",
  },
  SHIPPED: {
    short: "Shipped",
    title: "On its way to Ghana",
    headline: "On its way to Ghana",
    now: "Your package is travelling from China. This is the longest part of the trip — usually about a week.",
    expect: "Usually 2–4 days after payment",
  },
  ARRIVED: {
    short: "In Ghana",
    title: "Arrived in Ghana",
    headline: "Arrived in Ghana",
    now: "It's here! We're preparing it for delivery to you.",
    expect: "About 9–11 days after payment",
  },
  DELIVERED: {
    short: "Delivered",
    title: "Delivered",
    headline: "Delivered",
    now: "Enjoy it — and thank you for shopping with Ntemtem Deals.",
    expect: "10–12 days after payment",
  },
};

/** Owner-facing names and the button that moves an order on. */
export const ADMIN_STEP: Record<OrderStatusValue, { label: string; advance?: string; defaultNote?: string }> = {
  PENDING: { label: "Awaiting payment", advance: "Mark as paid", defaultNote: "Payment received — we're getting your order ready to source." },
  CONFIRMED: { label: "Paid", advance: "Mark as sourcing", defaultNote: "We're buying your items from our supplier and checking them." },
  SOURCING: { label: "Sourcing", advance: "Mark as shipped", defaultNote: "Your order has left China and is on its way to Ghana." },
  SHIPPED: { label: "Shipped to Ghana", advance: "Mark as arrived in Ghana", defaultNote: "Your order has arrived in Ghana. We'll be in touch to deliver it." },
  ARRIVED: { label: "In Ghana", advance: "Mark as delivered", defaultNote: "Delivered. Thank you for shopping with Ntemtem Deals!" },
  DELIVERED: { label: "Delivered" },
  CANCELLED: { label: "Cancelled" },
};

export function nextStatus(status: OrderStatusValue): FlowStatus | null {
  if (status === "CANCELLED") return null;
  const i = ORDER_FLOW.indexOf(status);
  return i >= 0 && i < ORDER_FLOW.length - 1 ? ORDER_FLOW[i + 1] : null;
}

export const stepIndex = (status: OrderStatusValue) => (status === "CANCELLED" ? -1 : ORDER_FLOW.indexOf(status));

/** Notes for the owner only (e.g. payment problems) never reach customers. */
export const INTERNAL_NOTE_PREFIX = "Internal:";
export const isInternalNote = (note: string | null | undefined) => !!note?.startsWith(INTERNAL_NOTE_PREFIX);
