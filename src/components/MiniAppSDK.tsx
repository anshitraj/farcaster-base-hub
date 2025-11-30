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
      } catch (error) {
        // Silently fail if SDK is not available (e.g., in regular browser)
        console.log("Farcaster Mini App SDK not available:", error);
      }
    }

    init();
  }, []);

  return null; // This component doesn't render anything
}

