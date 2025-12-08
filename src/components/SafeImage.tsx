"use client";

import Image from "next/image";
import { useState, ComponentProps } from "react";
import { optimizeDevImage } from "@/utils/optimizeDevImage";

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

  // Use optimizeDevImage to handle all URLs safely (local, external, uploads)
  const safeSrc = optimizeDevImage(imgSrc);

  return (
    <Image
      src={hasError ? fallbackSrc : safeSrc}
      alt={alt || ""}
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

