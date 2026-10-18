import "server-only";
import { v2 as cloudinary } from "cloudinary";
import {
  ACCEPTED_PHOTO_EXTENSIONS,
  DELIVERY_TRANSFORM,
  productPhotoFolder,
  publicIdFromUrl,
} from "@/lib/product-images";

type CloudinaryConfig = { cloudName: string; apiKey: string; apiSecret: string };

/** null when keys are missing or still placeholders — uploads then show a friendly notice. */
export function getCloudinaryConfig(): CloudinaryConfig | null {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  const real = (v?: string) => !!v && !/[<>]|your/i.test(v);
  if (!real(cloudName) || !real(apiKey) || !real(apiSecret)) return null;
  return { cloudName: cloudName!, apiKey: apiKey!, apiSecret: apiSecret! };
}

function client(config: CloudinaryConfig) {
  cloudinary.config({
    cloud_name: config.cloudName,
    api_key: config.apiKey,
    api_secret: config.apiSecret,
    secure: true,
  });
  return cloudinary;
}

/**
 * Signature for a direct browser -> Cloudinary upload. Files never pass
 * through our server (Vercel caps request bodies at 4.5MB; photos can be 10MB).
 * Folder and formats are signed, so the browser can't change them.
 */
export function signProductPhotoUpload(productId: string) {
  const config = getCloudinaryConfig();
  if (!config) return null;

  const params = {
    timestamp: Math.round(Date.now() / 1000),
    folder: productPhotoFolder(productId),
    allowed_formats: ACCEPTED_PHOTO_EXTENSIONS.join(","),
  };
  const signature = client(config).utils.api_sign_request(params, config.apiSecret);
  return { ...params, signature, apiKey: config.apiKey, cloudName: config.cloudName };
}

/** True only for photos uploaded through our signer, for this product. */
export function isOwnProductPhoto(url: string, productId: string) {
  const config = getCloudinaryConfig();
  if (!config) return false;
  const prefix = `https://res.cloudinary.com/${config.cloudName}/image/upload/${DELIVERY_TRANSFORM}/v`;
  if (!url.startsWith(prefix)) return false;
  const publicId = publicIdFromUrl(url);
  return !!publicId && new RegExp(`^${productPhotoFolder(productId)}/[A-Za-z0-9_-]+$`).test(publicId);
}

/** Best-effort removal of photos the owner deleted. Never throws. */
export async function destroyProductPhotos(urls: string[]) {
  const config = getCloudinaryConfig();
  const publicIds = urls.map(publicIdFromUrl).filter((id): id is string => !!id);
  if (!config || publicIds.length === 0) return;
  try {
    await client(config).api.delete_resources(publicIds);
  } catch (error) {
    console.error("Cloudinary: failed to delete photos", publicIds, error);
  }
}

/** Remove every photo (and the folder) for a deleted product. Never throws. */
export async function destroyProductFolder(productId: string) {
  const config = getCloudinaryConfig();
  if (!config) return;
  const folder = productPhotoFolder(productId);
  try {
    const api = client(config).api;
    await api.delete_resources_by_prefix(`${folder}/`);
    await api.delete_folder(folder).catch(() => {}); // fine if it never existed
  } catch (error) {
    console.error("Cloudinary: failed to delete folder", folder, error);
  }
}
