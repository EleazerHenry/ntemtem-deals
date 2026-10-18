export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** "Magnetic Car Charger (15W) – Black" -> "magnetic-car-charger-15w-black" */
export function slugify(input: string, maxLength = 80) {
  const slug = input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (slug.length <= maxLength) return slug;
  const cut = slug.slice(0, maxLength);
  // Prefer ending on a whole word
  return cut.includes("-") ? cut.slice(0, cut.lastIndexOf("-")) : cut;
}
