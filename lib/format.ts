const ghs = new Intl.NumberFormat("en-GH", {
  style: "currency",
  currency: "GHS",
  minimumFractionDigits: 2,
});

/** Format a GHS amount, e.g. 1250 -> "GH₵1,250.00". Accepts Prisma Decimal. */
export function formatGHS(amount: number | string | { toString(): string }) {
  return ghs.format(Number(amount.toString()));
}
