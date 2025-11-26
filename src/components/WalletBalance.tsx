"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";

interface WalletBalanceProps {
  wallet: string | null;
}

export default function WalletBalance({ wallet }: WalletBalanceProps) {
  const [balances, setBalances] = useState<{
    eth: { balance: string; symbol: string };
    usdc: { balance: string; symbol: string };
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalances = async () => {
    if (!wallet) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch("/api/wallet/balance", {
        credentials: "include",
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch balances");
      }
      
      if (data.balances) {
        setBalances(data.balances);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err: any) {
      console.error("Error fetching balances:", err);
      setError(err.message || "Failed to load balances");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (wallet) {
      fetchBalances();
      // Refresh every 30 seconds
      const interval = setInterval(fetchBalances, 30000);
      return () => clearInterval(interval);
    }
  }, [wallet]);

  if (!wallet) {
    return null;
  }

  const formatBalance = (balance: string, decimals: number = 6): string => {
    const num = parseFloat(balance);
    if (num === 0) return "0";
    if (num < 0.000001) return "<0.000001";
    if (num < 1) return num.toFixed(decimals);
    if (num < 1000) return num.toFixed(2);
    if (num < 1000000) return (num / 1000).toFixed(2) + "K";
    return (num / 1000000).toFixed(2) + "M";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="card-surface border-[hsl(var(--border))]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Wallet className="w-5 h-5 text-base-blue" />
              Wallet Balance
            </CardTitle>
            <button
              onClick={fetchBalances}
              disabled={loading}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
              title="Refresh balances"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-sm text-red-400 text-center py-4 space-y-2">
              <p>{error}</p>
              <button
                onClick={fetchBalances}
                className="text-xs text-base-blue hover:underline"
              >
                Try again
              </button>
            </div>
          ) : balances ? (
            <div className="grid grid-cols-2 gap-4">
              {/* ETH Balance */}
              <div className="p-4 rounded-lg bg-background-secondary border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-base-blue/20 flex items-center justify-center">
                    <span className="text-xs font-bold text-base-blue">Ξ</span>
                  </div>
                  <span className="text-xs text-muted-foreground">ETH</span>
                </div>
                <div className="text-lg font-bold">
                  {formatBalance(balances.eth.balance, 6)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Base Mainnet
                </div>
              </div>

              {/* USDC Balance */}
              <div className="p-4 rounded-lg bg-background-secondary border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                    <span className="text-xs font-bold text-green-400">$</span>
                  </div>
                  <span className="text-xs text-muted-foreground">USDC</span>
                </div>
                <div className="text-lg font-bold">
                  {formatBalance(balances.usdc.balance, 2)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Base Mainnet
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground text-center py-4">
              {loading ? "Loading balances..." : "No balances available"}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

