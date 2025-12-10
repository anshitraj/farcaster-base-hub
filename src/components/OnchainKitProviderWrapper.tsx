"use client";

import { OnchainKitProvider } from "@coinbase/onchainkit";
import { base } from "wagmi/chains";
import { ReactNode } from "react";

interface OnchainKitProviderWrapperProps {
  children: ReactNode;
}

export function OnchainKitProviderWrapper({ children }: OnchainKitProviderWrapperProps) {
  return (
    <OnchainKitProvider
      apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
      chain={base}
    >
      {children}
    </OnchainKitProvider>
  );
}

