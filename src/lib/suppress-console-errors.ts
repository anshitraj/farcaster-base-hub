/**
 * Suppress harmless console errors from third-party libraries
 * Specifically for Farcaster Mini App SDK's SES lockdown warnings
 */

if (typeof window !== "undefined") {
  const originalError = console.error;
  
  console.error = (...args: any[]) => {
    // Filter out harmless SES lockdown warnings
    const message = args[0]?.toString() || "";
    
    // Suppress "Removing intrinsics" warnings from lockdown-install.js
    if (
      message.includes("Removing intrinsics") ||
      message.includes("lockdown-install") ||
      (message.includes("%MapPrototype%") || message.includes("%WeakMapPrototype%") || message.includes("%DatePrototype%"))
    ) {
      // Silently ignore these warnings - they're harmless
      return;
    }
    
    // Pass through all other errors
    originalError.apply(console, args);
  };
}



