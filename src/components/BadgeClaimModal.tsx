"use client";

import { useState, useEffect } from "react";
import { X, Wallet, Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { getInjectedProvider } from "@/lib/wallet";
import Image from "next/image";

interface BadgeClaimModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  app: {
    id: string;
    name: string;
    description: string;
    iconUrl: string;
    category: string;
    badgeType?: "sbt" | "cast_your_app";
  } | null;
  onSuccess?: () => void;
}

export default function BadgeClaimModal({
  open,
  onOpenChange,
  app,
  onSuccess,
}: BadgeClaimModalProps) {
  const { toast } = useToast();
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  useEffect(() => {
    checkWalletConnection();
  }, []);

  const checkWalletConnection = async () => {
    try {
      const provider = getInjectedProvider();
      if (provider) {
        const accounts = await provider.request({ method: "eth_accounts" });
        if (accounts && accounts.length > 0) {
          setWalletConnected(true);
          setWalletAddress(accounts[0]);
        }
      }
    } catch (error) {
      console.error("Error checking wallet:", error);
    }
  };

  const connectWallet = async () => {
    try {
      const provider = getInjectedProvider();
      if (!provider) {
        toast({
          title: "No Wallet Found",
          description: "Please install a Web3 wallet to claim your badge",
          variant: "destructive",
        });
        return;
      }

      const accounts = await provider.request({
        method: "eth_requestAccounts",
      });

      if (accounts && accounts.length > 0) {
        setWalletConnected(true);
        setWalletAddress(accounts[0]);
        toast({
          title: "Wallet Connected",
          description: `Connected as ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect wallet",
        variant: "destructive",
      });
    }
  };

  const claimBadge = async () => {
    if (!app || !walletAddress) return;

    setClaiming(true);
    try {
      // Use the new badges/claim API endpoint
      const response = await fetch("/api/badges/claim", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          appId: app.id,
          badgeType: app.badgeType === "cast_your_app" ? "cast" : "developer",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.error || "Failed to claim badge";
        const errorDetails = data.details ? `: ${data.details}` : "";
        console.error("[Badge Claim] API Error:", {
          status: response.status,
          error: errorMsg,
          details: data.details,
          fullResponse: data,
        });
        throw new Error(`${errorMsg}${errorDetails}`);
      }

      setClaimed(true);
      
      // Build transaction link if txHash is available
      const txHash = data.txHash;
      const txLink = txHash ? `https://basescan.org/tx/${txHash}` : null;
      const message = data.message || "You've successfully claimed your Verified Mini Cast Store badge!";
      
      toast({
        title: "Badge Claimed! 🎉",
        description: (
          <div className="space-y-2">
            <p>{message}</p>
            {txLink && (
              <a
                href={txLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline text-sm flex items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                View Transaction on BaseScan
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
          </div>
        ),
      });

      // Trigger success callback to refresh badges immediately
      if (onSuccess) {
        onSuccess();
      }

      // Close modal after 3 seconds (increased to allow clicking the link)
      setTimeout(() => {
        onOpenChange(false);
        setClaimed(false);
      }, 3000);
    } catch (error: any) {
      toast({
        title: "Claim Failed",
        description: error.message || "Failed to claim badge. Please try again.",
        variant: "destructive",
      });
    } finally {
      setClaiming(false);
    }
  };

  if (!app) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-[#0A0A0A] border-gray-800">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold text-white">
              Claim Verified Mini Cast Store Badge
            </DialogTitle>
            <button
              onClick={() => onOpenChange(false)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <DialogDescription className="text-gray-400">
            {app.badgeType === "cast_your_app" 
              ? "Claim your 'Cast Your App' badge for listing this app on Base"
              : "Claim your unique SBT badge for owning this app on Base"}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 space-y-6">
          {/* Badge Preview */}
          <div className="flex justify-center">
            <div className="relative w-80 h-80 rounded-2xl overflow-hidden bg-gradient-to-br from-blue-900/20 to-purple-900/20 border-2 border-blue-500/30 p-4">
              <div className="w-full h-full rounded-xl bg-[#1A1A1A] flex items-center justify-center relative overflow-hidden">
                {app.badgeType === "cast_your_app" ? (
                  // Show Cast Your App badge image
                  <Image
                    src={process.env.NEXT_PUBLIC_CAST_BADGE_IMAGE_URL || "/badges/castyourapptransparent.webp"}
                    alt="Cast Your App Badge"
                    width={320}
                    height={320}
                    className="object-contain w-auto h-auto"
                    sizes="320px"
                  />
                ) : app.iconUrl ? (
                  // Show app icon for SBT badges
                  <Image
                    src={app.iconUrl}
                    alt={app.name}
                    width={256}
                    height={256}
                    className="object-contain"
                  />
                ) : (
                  <div className="text-6xl font-bold text-blue-400">
                    {app.name.charAt(0).toUpperCase()}
                  </div>
                )}
                {/* Glow effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Badge Info */}
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold text-white">{app.name}</h3>
            <p className="text-sm text-gray-400">{app.category}</p>
          </div>

          {/* Wallet Connection */}
          {!walletConnected ? (
            <Button
              onClick={connectWallet}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              size="lg"
            >
              <Wallet className="mr-2 h-4 w-4" />
              Activate Wallet
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-[#1A1A1A] rounded-lg border border-gray-800">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className="text-sm text-gray-300">
                    {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
                  </span>
                </div>
                <span className="text-xs text-gray-500">Base</span>
              </div>

              {claimed ? (
                <Button
                  disabled
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  size="lg"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Badge Claimed!
                </Button>
              ) : (
                <Button
                  onClick={claimBadge}
                  disabled={claiming}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                  size="lg"
                >
                  {claiming ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Claiming...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Claim Badge (Gas-Free)
                    </>
                  )}
                </Button>
              )}
            </div>
          )}

          {/* Info Text */}
          <div className="text-center space-y-1 pt-2 border-t border-gray-800">
            <p className="text-xs text-gray-500">
              This is a non-transferable token that has no financial value.
            </p>
            <p className="text-xs text-gray-500">
              Created by Base Mini App Store
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

