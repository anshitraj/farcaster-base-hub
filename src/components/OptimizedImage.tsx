"use client";

import Image from "next/image";
import { ComponentProps } from "react";

/**
 * OptimizedImage component
 * Wraps Next.js Image component to ensure WebP optimization
 * Automatically converts PNG images from Base Mini App JSON to WebP
 */
interface OptimizedImageProps extends ComponentProps<typeof Image> {
  src: string;
  alt: string;
  priority?: boolean;
  quality?: number;
}

export default function OptimizedImage({
  src,
  alt,
  priority = false,
  quality = 85,
  ...props
}: OptimizedImageProps) {
  // Next.js Image component automatically converts to WebP when:
  // 1. The browser supports it
  // 2. next.config.js has formats: ['image/avif', 'image/webp']
  // 3. The source image is not already WebP
  
  // For external images (like from Base Mini App JSON), Next.js will:
  // - Fetch the image
  // - Convert it to WebP if the browser supports it
  // - Serve the optimized version
  
  return (
    <Image
      src={src}
      alt={alt}
      priority={priority}
      quality={quality}
      // Ensure lazy loading for non-priority images
      loading={priority ? undefined : "lazy"}
      // Add blur placeholder for better UX
      placeholder={props.placeholder || "blur"}
      blurDataURL={
        props.blurDataURL ||
        "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjMTExODI3Ii8+PC9zdmc+"
      }
      // Ensure unoptimized is false so Next.js optimizes the image
      unoptimized={false}
      {...props}
    />
  );
}

