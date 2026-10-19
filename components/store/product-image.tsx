"use client";

import Image, { type ImageLoader, type ImageProps } from "next/image";

/**
 * Cloudinary does the resizing: swap the stored transform for one sized to
 * what the browser asked for. Keeps Vercel's image quota out of it entirely.
 */
const cloudinaryLoader: ImageLoader = ({ src, width, quality }) => {
  if (!src.includes("res.cloudinary.com") || !src.includes("/image/upload/")) return src;
  return src.replace(
    /\/image\/upload\/(?:[^/]+\/)?(v\d+\/)/,
    `/image/upload/c_limit,w_${width},q_${quality ?? "auto"},f_auto/$1`,
  );
};

export function ProductImage(props: Omit<ImageProps, "loader">) {
  // eslint-disable-next-line jsx-a11y/alt-text -- alt is passed through by callers
  return <Image {...props} loader={cloudinaryLoader} />;
}
