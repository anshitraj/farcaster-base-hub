"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAccount, useConnect } from "wagmi";
import { base } from "wagmi/chains";

export default function BaseLoginButton() {
  // ALL HOOKS MUST BE CALLED FIRST - before any conditional returns
  const [connecting, setConnecting] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const { toast } = useToast();
  const { address, isConnected, connector } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const hasAttemptedConnect = useRef(false); // Track if we've already attempted connection

  // Detect if we're on desktop (not mobile/Base App)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const checkDesktop = () => {
        // Check if we're in Base App or Farcaster Mini App
        const isInMiniApp = (window as any).farcaster || 
                           (window as any).ethereum?.isCoinbaseBrowser ||
                           (window as any).ethereum?.isBase;
        setIsDesktop(!isInMiniApp && window.innerWidth >= 768);
      };
      checkDesktop();
      window.addEventListener("resize", checkDesktop);
      return () => window.removeEventListener("resize", checkDesktop);
    }
  }, []);

  // Find Base Account connector (works with keys.coinbase.com)
  const baseAccountConnector = connectors.find(
    (c) => c.id === "baseAccount" || c.name?.toLowerCase().includes("base")
  );

  // Use sessionStorage to prevent repeated connection attempts across re-renders
  useEffect(() => {
    if (typeof window !== "undefined") {
      const attemptedKey = "baseLoginAttempted";
      const attempted = sessionStorage.getItem(attemptedKey);
      if (attempted === "true") {
        hasAttemptedConnect.current = true;
      }
    }
  }, []);

  useEffect(() => {
    // Update connecting state based on wagmi's pending state
    if (isPending) {
      setConnecting(true);
      // Mark as attempted in sessionStorage
      if (typeof window !== "undefined") {
        sessionStorage.setItem("baseLoginAttempted", "true");
      }
    } else {
      setConnecting(false);
      // Only reset attempt flag after a delay to prevent rapid re-connection attempts
      setTimeout(() => {
        if (!isPending && !isConnected) {
          hasAttemptedConnect.current = false;
          if (typeof window !== "undefined") {
            sessionStorage.removeItem("baseLoginAttempted");
          }
        }
      }, 2000); // Increased delay to 2 seconds
    }
  }, [isPending, isConnected]);

  // Reset attempt flag when connection state changes
  useEffect(() => {
    if (isConnected && address) {
      hasAttemptedConnect.current = false;
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("baseLoginAttempted");
        // Clear dismissed flag when user successfully connects
        localStorage.removeItem("baseLoginDismissed");
      }
    }
  }, [isConnected, address]);
  
  // Prevent auto-connect on mount - only connect when user explicitly clicks
  useEffect(() => {
    // On desktop, prevent baseAccount connector from auto-connecting
    // This prevents repeated popups when user hasn't explicitly clicked the button
    if (typeof window !== "undefined" && baseAccountConnector && isDesktop) {
      // CRITICAL: If user is already connected via ANY wallet (MetaMask, etc.), prevent Base auto-connect
      if (isConnected && address && connector?.id !== "baseAccount") {
        // User is connected via another wallet (like MetaMask), don't auto-connect Base
        // Prevent Wagmi from auto-reconnecting to Base
        try {
          const wagmiStorage = localStorage.getItem("wagmi.wallet");
          if (wagmiStorage) {
            const parsed = JSON.parse(wagmiStorage);
            // If baseAccount is stored but user is connected via another wallet, prevent auto-reconnect
            if (parsed?.current === "baseAccount") {
              // Clear baseAccount from storage to prevent auto-reconnect
              // User must explicitly click the button to switch to Base
              parsed.current = connector?.id || "injected";
              localStorage.setItem("wagmi.wallet", JSON.stringify(parsed));
            }
          }
        } catch (e) {
          // Ignore localStorage errors
        }
        return;
      }

      // If not connected and user hasn't explicitly attempted, prevent auto-connect
      if (!isConnected && !hasAttemptedConnect.current) {
        // Don't auto-connect on desktop - require explicit user action
        try {
          const wagmiStorage = localStorage.getItem("wagmi.wallet");
          if (wagmiStorage) {
            const parsed = JSON.parse(wagmiStorage);
            // If baseAccount is stored but user hasn't clicked, prevent auto-connect
            if (parsed?.current === "baseAccount") {
              // Remove baseAccount from storage to prevent auto-popup
              delete parsed.current;
              localStorage.setItem("wagmi.wallet", JSON.stringify(parsed));
              // Mark as dismissed to prevent showing button
              localStorage.setItem("baseLoginDismissed", "true");
            }
          }
        } catch (e) {
          // Ignore localStorage errors
        }
      }
    }
  }, [baseAccountConnector, isConnected, isDesktop, address, connector]);

  // Check if already connected via Base Account connector
  const isConnectedViaBase = isConnected && connector?.id === "baseAccount";

  const handleBaseLogin = async (e?: React.MouseEvent) => {
    // Prevent default and stop propagation
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // Prevent multiple simultaneous connection attempts
    if (connecting || isPending || hasAttemptedConnect.current) {
      console.log("Base login: Already connecting or attempted", { connecting, isPending, hasAttempted: hasAttemptedConnect.current });
      return;
    }

    // Don't connect if already connected via Base Account
    if (isConnectedViaBase || (isConnected && address)) {
      console.log("Base login: Already connected", { isConnectedViaBase, isConnected, address });
      return;
    }

    try {
      hasAttemptedConnect.current = true;
      setConnecting(true);
      
      // Clear dismissed flag when user explicitly clicks (they want to connect)
      if (typeof window !== "undefined") {
        localStorage.removeItem("baseLoginDismissed");
        sessionStorage.setItem("baseLoginAttempted", "true");
      }
      
      if (baseAccountConnector) {
        // Use Base Account connector which works with keys.coinbase.com
        // Only connect if user explicitly clicked (not auto-connect)
        connect({ 
          connector: baseAccountConnector, 
          chainId: base.id 
        });
      } else {
        // Fallback: Try injected connector if Coinbase Wallet is available
        const injectedConnector = connectors.find(c => c.id === "injected");
        if (injectedConnector && typeof window !== "undefined" && (window as any).ethereum?.isCoinbaseWallet) {
          connect({ 
            connector: injectedConnector, 
            chainId: base.id 
          });
        } else {
          toast({
            title: "Base Login Not Available",
            description: "Base Account connector not found. Please use 'Connect Wallet' instead.",
            variant: "destructive",
          });
          setConnecting(false);
          hasAttemptedConnect.current = false;
        }
      }
    } catch (error: any) {
      console.error("Base login error:", error);
      
      // If user cancelled or dismissed, mark as dismissed to prevent repeated popups
      if (error?.message?.includes("User rejected") || error?.message?.includes("User denied")) {
        if (typeof window !== "undefined" && isDesktop) {
          localStorage.setItem("baseLoginDismissed", "true");
        }
      }
      
      toast({
        title: "Login Failed",
        description: error.message || "Failed to connect with Base",
        variant: "destructive",
      });
      setConnecting(false);
      hasAttemptedConnect.current = false;
      
      // Clear session storage on error
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("baseLoginAttempted");
      }
    }
  };

  // NOW we can do conditional returns - after all hooks have been called
  // CRITICAL: Don't show login button if already connected (via ANY connector - MetaMask, Base, etc.)
  if (isConnected && address) {
    return null;
  }

  // On desktop, completely hide Base login button if user is connected via any wallet
  // This prevents the popup from appearing when user is already logged in with MetaMask
  if (isDesktop && isConnected && address) {
    return null;
  }

  // Hide button if Base Account connector is not available
  if (!baseAccountConnector) {
    return null;
  }

  // Don't show button if we're already attempting to connect
  if (hasAttemptedConnect.current && (connecting || isPending)) {
    return null;
  }

  // Check if we've attempted connection in this session (prevent repeated popups)
  const sessionAttempted = typeof window !== "undefined" && sessionStorage.getItem("baseLoginAttempted") === "true";
  if (sessionAttempted && !isConnected) {
    // Don't show button if we've already attempted and failed
    return null;
  }

  // On desktop, if user cancelled or dismissed the Base login popup, don't show it again
  // Check localStorage for a dismissed flag
  if (isDesktop && typeof window !== "undefined") {
    const dismissed = localStorage.getItem("baseLoginDismissed");
    if (dismissed === "true" && !isConnected) {
      return null;
    }
  }

  return (
    <Button
      onClick={handleBaseLogin}
      disabled={connecting || isPending || hasAttemptedConnect.current || sessionAttempted}
      className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white text-xs px-3 py-1.5 h-8 disabled:opacity-50 disabled:cursor-not-allowed"
      size="sm"
      type="button"
    >
      {connecting || isPending ? "Connecting..." : "Login with Base"}
    </Button>
  );
}

