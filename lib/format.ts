const ghs = new Intl.NumberFormat("en-GH", {
  style: "currency",
  currency: "GHS",
  minimumFractionDigits: 2,
});

const ghsTrim = new Intl.NumberFormat("en-GH", {
  style: "currency",
  currency: "GHS",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** Format a GHS amount, e.g. 1250 -> "GH₵1,250.00". Accepts Prisma Decimal. */
export function formatGHS(amount: number | string | { toString(): string }) {
  return ghs.format(Number(amount.toString()));
}

/** Shop prices: drop ".00" on whole amounts — 245 -> "GH₵245", 99.5 -> "GH₵99.50". */
export function formatPrice(amount: number) {
  return Number.isInteger(amount) ? ghsTrim.format(amount) : ghs.format(amount);
}
