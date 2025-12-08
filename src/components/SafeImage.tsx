"use client";

import Image from "next/image";
import { useState, ComponentProps } from "react";
import { optimizeDevImage, needsUnoptimized } from "@/utils/optimizeDevImage";

/**
 * SafeImage component
 * Wraps Next.js Image component with proper error handling for upstream failures
 * Automatically falls back to placeholder on error
 * Handles API routes with unoptimized={true} since Next.js Image can't optimize them
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
  
  // API routes cannot be optimized by Next.js Image, so use unoptimized
  const isUnoptimized = needsUnoptimized(safeSrc);

  return (
    <Image
      src={hasError ? fallbackSrc : safeSrc}
      alt={alt || ""}
      unoptimized={isUnoptimized}
      onError={(e) => {
        if (!hasError) {
          const target = e.target as HTMLImageElement;
          console.error(`[SafeImage] Image failed to load:`, {
            originalSrc: src,
            optimizedSrc: safeSrc,
            currentSrc: target.src,
            isApiRoute: isUnoptimized,
            fallbackSrc,
          });
          setHasError(true);
          setImgSrc(fallbackSrc);
        }
      }}
      {...props}
    />
  );
}

