/**
 * Utility functions to safely handle client-side only code and prevent hydration errors
 */

/**
 * Check if code is running on client-side
 */
export const isClient = typeof window !== "undefined";

/**
 * Safe localStorage access that prevents hydration errors
 */
export function safeLocalStorage(): Storage | null {
  if (!isClient) return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Safe sessionStorage access that prevents hydration errors
 */
export function safeSessionStorage(): Storage | null {
  if (!isClient) return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/**
 * Safe window access with type checking
 */
export function safeWindow(): Window | null {
  if (!isClient) return null;
  return window;
}

/**
 * Hook to check if component is hydrated (mounted on client)
 */
export function useIsHydrated() {
  const [isHydrated, setIsHydrated] = React.useState(false);
  
  React.useEffect(() => {
    setIsHydrated(true);
  }, []);
  
  return isHydrated;
}

import * as React from "react";







