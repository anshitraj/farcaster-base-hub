"use client";

import { useState, useEffect } from "react";
import { Zap } from "lucide-react";

export default function GasPriceDisplay() {
  const [gasPrice, setGasPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchGasPrice() {
      try {
        console.log("Fetching gas price from /api/gas-price");
        const res = await fetch("/api/gas-price", {
          credentials: "include",
          cache: "no-store",
        });
        
        console.log("Gas price API response status:", res.status);
        
        if (res.ok) {
          const data = await res.json();
          console.log("Gas price API response data:", data);
          
          // Accept any positive value, even if very small (< 0.01)
          if (data.gasPriceGwei !== null && data.gasPriceGwei !== undefined && data.gasPriceGwei > 0) {
            setGasPrice(data.gasPriceGwei);
            console.log("Gas price set to:", data.gasPriceGwei);
          } else {
            console.error("Gas price API returned invalid value:", data);
            setGasPrice(null);
          }
        } else {
          const errorData = await res.json().catch(() => ({}));
          console.error("Gas price API error:", res.status, errorData);
          setGasPrice(null);
        }
      } catch (error: any) {
        console.error("Error fetching gas price:", error.message || error);
        setGasPrice(null);
      } finally {
        setLoading(false);
      }
    }

    fetchGasPrice();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchGasPrice, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading || gasPrice === null) {
    return (
      <div className="flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1.5 md:py-2 rounded-lg bg-gray-900/50 border border-gray-800">
        <Zap className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-400" />
        <span className="text-[10px] md:text-xs text-gray-400">--</span>
      </div>
    );
  }

  // Display format: if less than 0.01, show "<0.01", otherwise show with 2 decimals
  const displayValue = gasPrice < 0.01 ? "<0.01" : gasPrice.toFixed(2);

  return (
    <div className="flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1.5 md:py-2 rounded-lg bg-gray-900/50 border border-gray-800 hover:bg-gray-800/50 transition-colors">
      <Zap className="w-3.5 h-3.5 md:w-4 md:h-4 text-base-blue" />
      <span className="text-[10px] md:text-xs font-semibold text-white">
        {displayValue} gwei
      </span>
    </div>
  );
}

