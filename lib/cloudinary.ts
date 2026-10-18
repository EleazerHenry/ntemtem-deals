import "server-only";
import { v2 as cloudinary } from "cloudinary";
import {
  ACCEPTED_PHOTO_EXTENSIONS,
  DELIVERY_TRANSFORM,
  categoryImageFolder,
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
function signFolderUpload(folder: string) {
  const config = getCloudinaryConfig();
  if (!config) return null;

  const params = {
    timestamp: Math.round(Date.now() / 1000),
    folder,
    allowed_formats: ACCEPTED_PHOTO_EXTENSIONS.join(","),
  };
  const signature = client(config).utils.api_sign_request(params, config.apiSecret);
  return { ...params, signature, apiKey: config.apiKey, cloudName: config.cloudName };
}

export const signProductPhotoUpload = (productId: string) => signFolderUpload(productPhotoFolder(productId));
export const signCategoryImageUpload = (categoryId: string) => signFolderUpload(categoryImageFolder(categoryId));
export type SignedUpload = NonNullable<ReturnType<typeof signFolderUpload>>;

/** True only for images uploaded through our signer into this exact folder. */
function isOwnPhoto(url: string, folder: string) {
  const config = getCloudinaryConfig();
  if (!config) return false;
  const prefix = `https://res.cloudinary.com/${config.cloudName}/image/upload/${DELIVERY_TRANSFORM}/v`;
  if (!url.startsWith(prefix)) return false;
  const publicId = publicIdFromUrl(url);
  return !!publicId && new RegExp(`^${folder}/[A-Za-z0-9_-]+$`).test(publicId);
}

export const isOwnProductPhoto = (url: string, productId: string) => isOwnPhoto(url, productPhotoFolder(productId));
export const isOwnCategoryImage = (url: string, categoryId: string) => isOwnPhoto(url, categoryImageFolder(categoryId));

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

/** Remove every image (and the folder) under one folder. Never throws. */
async function destroyFolder(folder: string) {
  const config = getCloudinaryConfig();
  if (!config) return;
  try {
    const api = client(config).api;
    await api.delete_resources_by_prefix(`${folder}/`);
    await api.delete_folder(folder).catch(() => {}); // fine if it never existed
  } catch (error) {
    console.error("Cloudinary: failed to delete folder", folder, error);
  }
}

export const destroyProductFolder = (productId: string) => destroyFolder(productPhotoFolder(productId));
export const destroyCategoryFolder = (categoryId: string) => destroyFolder(categoryImageFolder(categoryId));
