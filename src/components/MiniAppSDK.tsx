"use client";

import { useEffect } from "react";
import { sdk } from "@farcaster/miniapp-sdk";

export default function MiniAppSDK() {
  useEffect(() => {
    async function init() {
      try {
        // Only call when inside a Mini App
        const isMini = await sdk.isInMiniApp();
        
        if (isMini) {
          console.log("Mini App detected, calling sdk.actions.ready()");
          sdk.actions.ready();
        } else {
          console.log("Not in Mini App context, skipping sdk.actions.ready()");
        }
      } catch (error: any) {
        // Silently fail if SDK is not available (e.g., in regular browser)
        // Only log in development mode to avoid console spam
        if (process.env.NODE_ENV === 'development') {
          console.debug("Farcaster Mini App SDK not available (expected in regular browser):", error?.message || error);
        }
      }
    }

    init();
  }, []);

  return null; // This component doesn't render anything
}

