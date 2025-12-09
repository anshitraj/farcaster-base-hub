"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
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
    // Don't fetch if still checking auth
    if (authLoading) {
      setLoading(true);
      setPoints(null);
      return;
    }

    // Don't fetch if not authenticated - hide the component
    if (!isAuthenticated) {
      setPoints(null);
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
          // Only set points if we got valid data and user is authenticated
          if (isAuthenticated) {
            setPoints(data.totalPoints || 0);
          } else {
            setPoints(null);
          }
        } else if (res.status === 401) {
          // User is not authenticated, clear points
          setPoints(null);
        } else {
          setPoints(null);
        }
      } catch (error) {
        if (!mounted) return;
        console.error("Error fetching points:", error);
        setPoints(null);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    // Only fetch if authenticated
    if (isAuthenticated) {
      fetchPoints();
    }
    
    // Listen for wallet connection to refresh points
    const handleWalletConnect = () => {
      if (mounted) {
        setTimeout(fetchPoints, 1000);
      }
    };

    const handleWalletDisconnect = () => {
      if (mounted) {
        setPoints(null);
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

  // Don't show points display if:
  // - Still loading auth state
  // - Not authenticated
  // - Points are null (not fetched or user disconnected)
  // - Points are 0 (hide for cleaner UI)
  if (loading || authLoading || points === null || !isAuthenticated || points === 0) {
    return null;
  }

  // Double-check: only show if we have valid points and are authenticated
  if (typeof points !== 'number' || points <= 0 || !isAuthenticated) {
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
            <Image 
              src="/points.webp" 
              alt="Points" 
              width={16} 
              height={16} 
              className="w-4 h-4"
            />
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

