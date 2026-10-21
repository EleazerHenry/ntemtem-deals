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

/** "+233241234567" -> "+233 24 123 4567" (anything else is returned as-is). */
export function formatPhone(phone: string | null | undefined) {
  const m = phone?.match(/^\+233(\d{2})(\d{3})(\d{4})$/);
  return m ? `+233 ${m[1]} ${m[2]} ${m[3]}` : (phone ?? "");
}
