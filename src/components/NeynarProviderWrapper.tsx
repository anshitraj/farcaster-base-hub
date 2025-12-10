"use client";

import { NeynarContextProvider, Theme } from "@neynar/react";
import { ReactNode } from "react";

interface NeynarProviderWrapperProps {
  children: ReactNode;
}

export function NeynarProviderWrapper({ children }: NeynarProviderWrapperProps) {
  // For Base App mini app notifications, the provider might not be strictly required
  // But we'll provide it with minimal settings if clientId is available
  const clientId = process.env.NEXT_PUBLIC_NEYNAR_CLIENT_ID || "";
  
  // If no clientId, just pass through children
  // The useMiniApp hook from @neynar/react should work with Base App SDK without provider
  if (!clientId) {
    return <>{children}</>;
  }
  
  try {
    return (
      <NeynarContextProvider
        settings={{
          clientId,
          defaultTheme: Theme.Dark,
          eventsCallbacks: {
            onAuthSuccess: () => {
              // Optional: Handle auth success if needed
            },
            onSignout: () => {
              // Optional: Handle signout if needed
            },
          },
        }}
      >
        {children}
      </NeynarContextProvider>
    );
  } catch (error) {
    // If provider fails, just render children
    console.warn("NeynarContextProvider failed, rendering without it:", error);
    return <>{children}</>;
  }
}

