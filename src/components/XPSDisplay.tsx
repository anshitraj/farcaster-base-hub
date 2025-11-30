"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Zap } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { useMiniApp } from "@/components/MiniAppProvider";

export default function XPSDisplay() {
  const [xps, setXps] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { isInMiniApp, loaded: miniAppLoaded } = useMiniApp();
  const router = useRouter();

  useEffect(() => {
    // Don't wait for Mini App - fetch immediately
    // Wagmi handles connection, we can fetch XPS right away
    // Don't fetch if not authenticated or still checking auth
    if (authLoading || !isAuthenticated) {
      setXps(0);
      setLoading(false);
      return;
    }

    let mounted = true;

    async function fetchXPS() {
      try {
        // Fetch XP directly from the XP API endpoint
        // This endpoint handles missing developer records gracefully
        const res = await fetch("/api/xp/claim", {
          credentials: "include",
        });
        
        if (!mounted) return;

        if (res.ok) {
          const data = await res.json();
          setXps(data.totalXP || 0);
        } else if (res.status === 401) {
          // User is not authenticated
          setXps(0);
        } else {
          setXps(0);
        }
      } catch (error) {
        if (!mounted) return;
        console.error("Error fetching XPS:", error);
        setXps(0);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchXPS();
    
    // Listen for wallet connection to refresh XPS
    const handleWalletConnect = () => {
      if (mounted) {
        setTimeout(fetchXPS, 1000);
      }
    };

    const handleWalletDisconnect = () => {
      if (mounted) {
        setXps(0);
        setLoading(false);
      }
    };
    
    window.addEventListener("walletConnected", handleWalletConnect);
    window.addEventListener("walletDisconnected", handleWalletDisconnect);
    
    return () => {
      mounted = false;
      window.removeEventListener("walletConnected", handleWalletConnect);
      window.removeEventListener("walletDisconnected", handleWalletDisconnect);
    };
  }, [isAuthenticated, authLoading]);

  // Don't show XPS display if user is not authenticated
  if (loading || xps === null || !isAuthenticated) {
    return null;
  }

  // Show XPS even when 0 (so users know the feature exists)
  // If you want to hide when 0, uncomment the line below:
  // if (xps === 0) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link 
            href="/dashboard"
            className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 md:px-2.5 py-1 sm:py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500/20 transition-colors cursor-pointer flex-shrink-0 min-w-0"
            onClick={(e) => {
              e.preventDefault();
              router.push("/dashboard");
            }}
          >
            <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-400 fill-purple-400 flex-shrink-0" />
            <span className="text-[10px] sm:text-[11px] md:text-xs font-semibold text-purple-400 whitespace-nowrap truncate">
              {xps.toLocaleString()}
              <span className="hidden sm:inline ml-0.5">XPS</span>
            </span>
          </Link>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">Your Experience Points (XPS)</p>
          <p className="text-xs text-muted-foreground mt-1">
            Click to view your developer dashboard!
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

