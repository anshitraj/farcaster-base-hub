"use client";

import { useState, useEffect } from "react";

interface AuthState {
  isAuthenticated: boolean;
  wallet: string | null;
  loading: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    wallet: null,
    loading: true,
  });

  useEffect(() => {
    let mounted = true;

    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/wallet", {
          credentials: "include",
        });

        if (!mounted) return;

        if (res.ok) {
          const data = await res.json();
          setAuthState({
            isAuthenticated: !!data.wallet,
            wallet: data.wallet || null,
            loading: false,
          });
        } else {
          setAuthState({
            isAuthenticated: false,
            wallet: null,
            loading: false,
          });
        }
      } catch (error) {
        if (!mounted) return;
        console.error("Auth check error:", error);
        setAuthState({
          isAuthenticated: false,
          wallet: null,
          loading: false,
        });
      }
    }

    checkAuth();

    // Listen for wallet connection/disconnection events
    const handleWalletConnect = () => {
      if (mounted) {
        checkAuth();
      }
    };

    const handleWalletDisconnect = () => {
      if (mounted) {
        setAuthState({
          isAuthenticated: false,
          wallet: null,
          loading: false,
        });
      }
    };

    window.addEventListener("walletConnected", handleWalletConnect);
    window.addEventListener("walletDisconnected", handleWalletDisconnect);

    return () => {
      mounted = false;
      window.removeEventListener("walletConnected", handleWalletConnect);
      window.removeEventListener("walletDisconnected", handleWalletDisconnect);
    };
  }, []);

  return authState;
}

