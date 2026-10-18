import { deliveryUrl } from "@/lib/product-images";

/** What the server's signer hands the browser (see lib/cloudinary.ts). */
export type UploadSignature = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  allowed_formats: string;
};

/** Browser -> Cloudinary upload with progress. Resolves to the stored delivery URL. */
export function uploadToCloudinary(file: File, signed: UploadSignature, onProgress: (pct: number) => void) {
  return new Promise<string>((resolve, reject) => {
    const body = new FormData();
    body.append("file", file);
    body.append("api_key", signed.apiKey);
    body.append("timestamp", String(signed.timestamp));
    body.append("signature", signed.signature);
    body.append("folder", signed.folder);
    body.append("allowed_formats", signed.allowed_formats);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${signed.cloudName}/image/upload`);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      try {
        const res = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(deliveryUrl(signed.cloudName, res.version, res.public_id));
        } else {
          reject(new Error(res?.error?.message ?? `Upload failed (${xhr.status})`));
        }
      } catch {
        reject(new Error("Upload failed — unexpected response"));
      }
    };
    xhr.onerror = () => reject(new Error("No connection — check your internet and try again"));
    xhr.send(body);
  });
}
