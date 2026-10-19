// Product photo rules and Cloudinary URL helpers — safe for client and server.

export const MAX_PHOTOS = 8;
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_PHOTO_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
export const ACCEPTED_PHOTO_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];

/** Baked into every stored URL: auto quality + format, never wider than 1200px. */
export const DELIVERY_TRANSFORM = "q_auto,f_auto,c_limit,w_1200";

export const productPhotoFolder = (productId: string) => `ntemtem-deals/products/${productId}`;
export const categoryImageFolder = (categoryId: string) => `ntemtem-deals/categories/${categoryId}`;

export function deliveryUrl(cloudName: string, version: number, publicId: string) {
  return `https://res.cloudinary.com/${cloudName}/image/upload/${DELIVERY_TRANSFORM}/v${version}/${publicId}`;
}

/** Square, smart-cropped thumbnail of a stored product photo. */
export function thumbnailUrl(url: string, size = 240) {
  return url.replace(`/upload/${DELIVERY_TRANSFORM}/`, `/upload/c_fill,g_auto,w_${size},h_${size},q_auto,f_auto/`);
}

/** "…/upload/<transform>/v123/ntemtem-deals/products/abc/xyz" -> "ntemtem-deals/products/abc/xyz" */
export function publicIdFromUrl(url: string) {
  return url.match(/\/upload\/[^/]+\/v\d+\/(.+)$/)?.[1] ?? null;
}

/** Plain-language reason a file can't be uploaded, or null if it's fine. */
export function photoProblem(file: File): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const typeOk = file.type ? file.type in ACCEPTED_PHOTO_TYPES : ACCEPTED_PHOTO_EXTENSIONS.includes(ext);
  if (!typeOk) return `“${file.name}” isn't a JPG, PNG or WebP photo.`;
  if (file.size > MAX_PHOTO_BYTES) {
    return `“${file.name}” is ${(file.size / 1024 / 1024).toFixed(1)}MB — photos must be 10MB or smaller.`;
  }
  if (file.size === 0) return `“${file.name}” is empty.`;
  return null;
}

/** 1200×630 social-share image (WhatsApp, Facebook, X previews). */
export function ogImageUrl(url: string) {
  return url.replace(`/upload/${DELIVERY_TRANSFORM}/`, "/upload/c_fill,g_auto,w_1200,h_630,q_auto,f_jpg/");
}
