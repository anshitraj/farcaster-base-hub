"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { CheckCircle2, Loader2, Sparkles, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AppBadgeSectionProps {
  app: {
    id: string;
    name: string;
    status: string;
    developerBadgeReady: boolean;
    developerBadgeImage?: string | null;
    castBadgeMinted: boolean;
    developerBadgeMinted: boolean;
    developer?: {
      wallet: string;
    } | null;
    farcasterJson?: string | null;
  };
  currentWallet?: string | null;
}

export default function AppBadgeSection({ app, currentWallet }: AppBadgeSectionProps) {
  const { toast } = useToast();
  const [claimingCast, setClaimingCast] = useState(false);
  const [claimingDeveloper, setClaimingDeveloper] = useState(false);
  const [castMinted, setCastMinted] = useState(app.castBadgeMinted);
  const [developerMinted, setDeveloperMinted] = useState(app.developerBadgeMinted);

  // Check if current wallet is the owner from farcaster.json
  const isOwner = (() => {
    if (!currentWallet || !app.farcasterJson) return false;
    try {
      const farcasterData = JSON.parse(app.farcasterJson);
      const ownerAddress = farcasterData.ownerAddress || farcasterData.owner;
      if (ownerAddress) {
        return ownerAddress.toLowerCase().trim() === currentWallet.toLowerCase();
      }
    } catch (e) {
      // Ignore errors
    }
    return false;
  })();

  // Check if current wallet is the developer who listed the app
  const isLister = app.developer?.wallet.toLowerCase() === currentWallet?.toLowerCase();

  const handleClaimCast = async () => {
    if (!isLister) {
      toast({
        title: "Not Authorized",
        description: "Only the developer who listed this app can claim the Cast Your App badge.",
        variant: "destructive",
      });
      return;
    }

    setClaimingCast(true);
    try {
      const res = await fetch("/api/badges/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          appId: app.id,
          badgeType: "cast",
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setCastMinted(true);
        const txHash = data.txHash;
        const txLink = txHash ? `https://basescan.org/tx/${txHash}` : null;
        toast({
          title: "Badge Claimed! 🎉",
          description: (
            <div className="space-y-2">
              <p>Cast Your App badge has been minted successfully!</p>
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
      } else {
        throw new Error(data.error || "Failed to claim badge");
      }
    } catch (error: any) {
      toast({
        title: "Claim Failed",
        description: error.message || "Failed to claim badge. Please try again.",
        variant: "destructive",
      });
    } finally {
      setClaimingCast(false);
    }
  };

  const handleClaimDeveloper = async () => {
    if (!isOwner) {
      toast({
        title: "Not Authorized",
        description: "Only the app owner (from farcaster.json) can claim the developer badge.",
        variant: "destructive",
      });
      return;
    }

    if (!app.developerBadgeReady) {
      toast({
        title: "Badge Not Ready",
        description: "Your developer badge is being created and will be available within 24 hours. Please check again later.",
        variant: "destructive",
      });
      return;
    }

    setClaimingDeveloper(true);
    try {
      const res = await fetch("/api/badges/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          appId: app.id,
          badgeType: "developer",
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setDeveloperMinted(true);
        const txHash = data.txHash;
        const txLink = txHash ? `https://basescan.org/tx/${txHash}` : null;
        toast({
          title: "Badge Claimed! 🎉",
          description: (
            <div className="space-y-2">
              <p>Developer badge has been minted successfully!</p>
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
      } else {
        throw new Error(data.error || data.message || "Failed to claim badge");
      }
    } catch (error: any) {
      toast({
        title: "Claim Failed",
        description: error.message || "Failed to claim badge. Please try again.",
        variant: "destructive",
      });
    } finally {
      setClaimingDeveloper(false);
    }
  };

  // Only show badges if app is approved
  if (app.status !== "approved") {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      {/* Cast Your App Badge */}
      <Card className="glass-card p-6">
        <div className="flex flex-col items-center text-center">
          <div className="relative w-32 h-32 mb-4 rounded-xl overflow-hidden">
            <Image
              src="/badges/castapp.webp"
              alt="Cast Your App Badge"
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
          <h3 className="text-lg font-semibold mb-2">Cast Your App Badge</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Awarded for publishing an approved app on MiniCast Store.
          </p>
          {castMinted ? (
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-sm font-medium">Badge Minted</span>
            </div>
          ) : isLister ? (
            <Button
              onClick={handleClaimCast}
              disabled={claimingCast}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 w-full"
            >
              {claimingCast ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Claiming...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Claim Now
                </>
              )}
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              Only the developer who listed this app can claim this badge.
            </p>
          )}
        </div>
      </Card>

      {/* Developer Badge */}
      <Card className="glass-card p-6">
        <div className="flex flex-col items-center text-center">
          {app.developerBadgeReady && app.developerBadgeImage ? (
            <div className="relative w-32 h-32 mb-4 rounded-xl overflow-hidden">
              <Image
                src={app.developerBadgeImage}
                alt={`${app.name} Developer Badge`}
                fill
                className="object-contain"
              />
            </div>
          ) : (
            <div className="relative w-32 h-32 mb-4 rounded-xl overflow-hidden bg-gray-800 flex items-center justify-center">
              <Clock className="w-12 h-12 text-gray-600" />
            </div>
          )}
          <h3 className="text-lg font-semibold mb-2">Developer Badge</h3>
          {!app.developerBadgeReady ? (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                Your developer badge is being created and will be available within 24 hours. Please check again later.
              </p>
              <Button disabled className="w-full opacity-50">
                <Clock className="w-4 h-4 mr-2" />
                Badge Pending
              </Button>
            </>
          ) : developerMinted ? (
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-sm font-medium">Developer Badge Minted</span>
            </div>
          ) : isOwner ? (
            <Button
              onClick={handleClaimDeveloper}
              disabled={claimingDeveloper}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 w-full"
            >
              {claimingDeveloper ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Claiming...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Claim Badge (Gas-Free)
                </>
              )}
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              Only the app owner (from farcaster.json) can claim this badge.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}

