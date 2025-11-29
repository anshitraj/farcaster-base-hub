"use client";

import { useEffect } from "react";

/**
 * Component to help debug image formats in development
 * Add this to your layout or page to see image format info in console
 */
export default function ImageFormatDebugger() {
  useEffect(() => {
    // Only run in development
    if (process.env.NODE_ENV !== "development") return;

    const checkImageFormats = () => {
      const images = document.querySelectorAll("img");
      console.group("🖼️ Image Format Checker");
      console.log(`Found ${images.length} images on the page`);

      images.forEach((img, index) => {
        const src = img.getAttribute("src") || img.getAttribute("srcset") || "";
        const isNextImage = src.includes("/_next/image");

        // Check if it's a Next.js optimized image
        if (isNextImage) {
          console.log(`Image ${index + 1} (Next.js Optimized):`, {
            src: src.substring(0, 80) + "...",
            element: img,
          });
        } else {
          console.log(`Image ${index + 1} (Direct):`, {
            src: src.substring(0, 80) + "...",
            element: img,
          });
        }
      });

      console.groupEnd();
    };

    // Check after a delay to ensure images are loaded
    const timeout = setTimeout(checkImageFormats, 2000);

    // Also check when images load
    const images = document.querySelectorAll("img");
    images.forEach((img) => {
      img.addEventListener("load", () => {
        const src = img.getAttribute("src") || "";
        if (src.includes("/_next/image")) {
          console.log("✅ Next.js optimized image loaded:", src.substring(0, 80));
        }
      });
    });

    return () => clearTimeout(timeout);
  }, []);

  return null; // This component doesn't render anything
}

