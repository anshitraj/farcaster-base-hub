"use client";

import { useState, useEffect } from "react";

export default function GasPriceDisplay() {
  const [gasPriceUSD, setGasPriceUSD] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchGasPrice() {
      try {
        const res = await fetch("/api/gas-price", {
          credentials: "include",
          cache: "no-store",
        });
        
        console.log("Gas price API response status:", res.status);
        
        if (res.ok) {
          const data = await res.json();
          console.log("Gas price API data:", data);
          
          // Use gasPriceUSD if available, otherwise calculate from gwei
          if (data.gasPriceUSD !== null && data.gasPriceUSD !== undefined && data.gasPriceUSD > 0) {
            console.log("Setting gas price USD:", data.gasPriceUSD);
            setGasPriceUSD(data.gasPriceUSD);
          } else if (data.gasPriceGwei !== null && data.gasPriceGwei !== undefined && data.gasPriceGwei > 0 && data.ethPriceUSD) {
            // Fallback: calculate from gwei if USD not provided
            const gasPriceInETH = data.gasPriceGwei / 1e9;
            const standardTxGas = 21000;
            const calculatedUSD = gasPriceInETH * data.ethPriceUSD * standardTxGas;
            console.log("Calculated gas price USD:", calculatedUSD);
            setGasPriceUSD(calculatedUSD);
          } else {
            console.warn("No valid gas price data:", data);
            setGasPriceUSD(null);
          }
        } else {
          const errorData = await res.json().catch(() => ({}));
          console.error("Gas price API error:", res.status, errorData);
          setGasPriceUSD(null);
        }
      } catch (error: any) {
        console.error("Error fetching gas price:", error.message || error);
        setGasPriceUSD(null);
      } finally {
        setLoading(false);
      }
    }

    // Fetch immediately
    fetchGasPrice();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchGasPrice, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1.5 md:py-2 rounded-lg bg-gray-900/50 border border-gray-800">
        <span className="text-[10px] md:text-xs text-gray-400 font-semibold">GWEI</span>
        <span className="text-[10px] md:text-xs text-gray-400">...</span>
      </div>
    );
  }

  if (gasPriceUSD === null) {
    return (
      <div className="flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1.5 md:py-2 rounded-lg bg-gray-900/50 border border-gray-800">
        <span className="text-[10px] md:text-xs text-gray-400 font-semibold">GWEI</span>
        <span className="text-[10px] md:text-xs text-gray-400">--</span>
      </div>
    );
  }

  // Display format: if less than $0.01, show "<$0.01", otherwise show with appropriate decimals
  let displayValue: string;
  if (gasPriceUSD < 0.01) {
    displayValue = "<$0.01";
  } else if (gasPriceUSD < 1) {
    displayValue = `$${gasPriceUSD.toFixed(3)}`;
  } else {
    displayValue = `$${gasPriceUSD.toFixed(2)}`;
  }

  return (
    <div className="flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1.5 md:py-2 rounded-lg bg-gray-900/50 border border-gray-800 hover:bg-gray-800/50 transition-colors">
      <span className="text-[10px] md:text-xs font-semibold text-base-blue">GWEI</span>
      <span className="text-[10px] md:text-xs font-semibold text-white">
        {displayValue}
      </span>
    </div>
  );
}

