"use client";

import { useState, useEffect } from "react";
import { Coins } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function PointsDisplay() {
  const [points, setPoints] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPoints() {
      try {
        const res = await fetch("/api/points", {
          credentials: "include",
        });
        
        if (res.ok) {
          const data = await res.json();
          setPoints(data.totalPoints || 0);
        } else {
          setPoints(0);
        }
      } catch (error) {
        console.error("Error fetching points:", error);
        setPoints(0);
      } finally {
        setLoading(false);
      }
    }

    fetchPoints();
    
    // Listen for wallet connection to refresh points
    const handleWalletConnect = () => {
      setTimeout(fetchPoints, 1000);
    };
    
    window.addEventListener("walletConnected", handleWalletConnect);
    
    return () => {
      window.removeEventListener("walletConnected", handleWalletConnect);
    };
  }, []);

  if (loading || points === null) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-base-cyan/10 border border-base-cyan/30">
        <Coins className="w-4 h-4 text-base-cyan animate-pulse" />
        <span className="text-xs font-semibold text-base-cyan">...</span>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-base-cyan/10 border border-base-cyan/30 hover:bg-base-cyan/20 transition-colors cursor-pointer">
            <Coins className="w-4 h-4 text-base-cyan fill-base-cyan" />
            <span className="text-xs font-semibold text-base-cyan">
              {points.toLocaleString()}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">Your points balance</p>
          <p className="text-xs text-muted-foreground mt-1">
            Earn 100 points for each review you submit!
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

