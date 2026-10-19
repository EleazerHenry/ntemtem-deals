const dayMonth = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "Africa/Accra" });

/** "10-12 days" -> "29 Oct – 31 Oct" counted from today; null if it can't be read. */
export function arrivalWindow(estimate: string, from = new Date()) {
  const nums = estimate.match(/\d+/g)?.map(Number);
  if (!nums?.length || nums[0] > 120) return null;
  const [lo, hi = lo] = nums;
  const day = 24 * 60 * 60 * 1000;
  const start = dayMonth.format(new Date(from.getTime() + lo * day));
  const end = dayMonth.format(new Date(from.getTime() + hi * day));
  return start === end ? start : `${start} – ${end}`;
}
