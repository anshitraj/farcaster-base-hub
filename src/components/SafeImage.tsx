"use client";

import Image from "next/image";
import { useState, ComponentProps } from "react";

/**
 * SafeImage component
 * Wraps Next.js Image component with proper error handling for upstream failures
 * Automatically falls back to placeholder on error
 */
interface SafeImageProps extends Omit<ComponentProps<typeof Image>, "src"> {
  src: string;
  fallbackSrc?: string;
}

export default function SafeImage({
  src,
  fallbackSrc = "/placeholder.svg",
  alt,
  ...props
}: SafeImageProps) {
  const [imgSrc, setImgSrc] = useState<string>(src);
  const [hasError, setHasError] = useState(false);

  // If the image is external and might fail, use unoptimized to avoid upstream errors
  const isExternal = src.startsWith("http://") || src.startsWith("https://");
  const isLocal = src.startsWith("/") && !src.startsWith("/api/");

  // For external URLs that might fail, route through our API which has error handling
  const safeSrc = isExternal && !src.includes("/api/") 
    ? `/api/icon?url=${encodeURIComponent(src)}`
    : imgSrc;

  return (
    <Image
      src={hasError ? fallbackSrc : safeSrc}
      alt={alt || ""}
      unoptimized={isExternal && !src.includes("/api/")}
      onError={() => {
        if (!hasError) {
          setHasError(true);
          setImgSrc(fallbackSrc);
        }
      }}
      {...props}
    />
  );
}

