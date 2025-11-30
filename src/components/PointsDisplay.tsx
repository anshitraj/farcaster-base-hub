"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Coins } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { useMiniApp } from "@/components/MiniAppProvider";

export default function PointsDisplay() {
  const [points, setPoints] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { isInMiniApp, loaded: miniAppLoaded } = useMiniApp();
  const router = useRouter();

  useEffect(() => {
    // Don't wait for Mini App - fetch immediately
    // Wagmi handles connection, we can fetch points right away
    // Don't fetch if not authenticated or still checking auth
    if (authLoading || !isAuthenticated) {
      setPoints(0);
      setLoading(false);
      return;
    }

    let mounted = true;

    async function fetchPoints() {
      try {
        const res = await fetch("/api/points", {
          credentials: "include",
        });
        
        if (!mounted) return;

        if (res.ok) {
          const data = await res.json();
          setPoints(data.totalPoints || 0);
        } else if (res.status === 401) {
          // User is not authenticated, set points to 0
          setPoints(0);
        } else {
          setPoints(0);
        }
      } catch (error) {
        if (!mounted) return;
        console.error("Error fetching points:", error);
        setPoints(0);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchPoints();
    
    // Listen for wallet connection to refresh points
    const handleWalletConnect = () => {
      if (mounted) {
        setTimeout(fetchPoints, 1000);
      }
    };

    const handleWalletDisconnect = () => {
      if (mounted) {
        setPoints(0);
        setLoading(false);
      }
    };
    
    const handlePointsUpdated = () => {
      if (mounted) {
        // Refresh points after a short delay to ensure database is updated
        setTimeout(fetchPoints, 500);
      }
    };
    
    window.addEventListener("walletConnected", handleWalletConnect);
    window.addEventListener("walletDisconnected", handleWalletDisconnect);
    window.addEventListener("pointsUpdated", handlePointsUpdated);
    
    return () => {
      mounted = false;
      window.removeEventListener("walletConnected", handleWalletConnect);
      window.removeEventListener("walletDisconnected", handleWalletDisconnect);
      window.removeEventListener("pointsUpdated", handlePointsUpdated);
    };
  }, [isAuthenticated, authLoading]);

  // Don't show points display if user is not authenticated or has 0 points
  if (loading || points === null || !isAuthenticated) {
    return null;
  }

  // Only show if user has points (hide when 0 for cleaner UI)
  if (points === 0) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link 
            href="/quests"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-base-cyan/10 border border-base-cyan/30 hover:bg-base-cyan/20 transition-colors cursor-pointer"
            onClick={(e) => {
              e.preventDefault();
              router.push("/quests");
            }}
          >
            <Coins className="w-4 h-4 text-base-cyan fill-base-cyan" />
            <span className="text-xs font-semibold text-base-cyan">
              {points.toLocaleString()}
            </span>
          </Link>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">Your points balance</p>
          <p className="text-xs text-muted-foreground mt-1">
            Click to view all quests and ways to earn points!
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

