"use client";

import { useState, useEffect } from "react";
import { Sparkles, Trophy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import BadgeClaimModal from "@/components/BadgeClaimModal";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";

interface ClaimableApp {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  category: string;
  url: string;
  createdAt: string;
  badgeType?: "sbt" | "cast_your_app";
}

interface ClaimedBadge {
  id: string;
  name: string;
  imageUrl: string;
  appName: string;
  badgeType?: "sbt" | "cast_your_app";
  txHash?: string;
  claimedAt?: string;
}

export default function CollectiblesSection() {
  const { toast } = useToast();
  const [claimableApps, setClaimableApps] = useState<ClaimableApp[]>([]);
  const [claimedBadges, setClaimedBadges] = useState<ClaimedBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<ClaimableApp | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    fetchCollectibles();
  }, []);

  const fetchCollectibles = async () => {
    try {
      setLoading(true);
      const [claimableRes, badgesRes] = await Promise.all([
        fetch("/api/badge/claimable-apps"),
        fetch("/api/badge/my-badges"),
      ]);

      if (claimableRes.ok) {
        const claimableData = await claimableRes.json();
        setClaimableApps(claimableData.claimableApps || []);
      }

      if (badgesRes.ok) {
        const badgesData = await badgesRes.json();
        setClaimedBadges(badgesData.badges || []);
      }
    } catch (error) {
      console.error("Error fetching collectibles:", error);
      toast({
        title: "Error",
        description: "Failed to load collectibles",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClaimClick = (app: ClaimableApp) => {
    setSelectedApp(app);
    setModalOpen(true);
  };

  const handleClaimSuccess = () => {
    fetchCollectibles(); // Refresh after claiming
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Claimable Badges Section */}
      {claimableApps.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-blue-400" />
            <h2 className="text-xl font-bold text-white">
              Available Badges ({claimableApps.length})
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {claimableApps.map((app) => (
              <div
                key={app.id}
                className="bg-[#1A1A1A] rounded-lg border border-gray-800 p-4 hover:border-blue-500/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  {app.iconUrl && (
                    <Image
                      src={app.iconUrl}
                      alt={app.name}
                      width={48}
                      height={48}
                      className="rounded-lg"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white truncate">
                      {app.name}
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">{app.category}</p>
                    {app.badgeType && (
                      <p className="text-xs text-blue-400 mt-1">
                        {app.badgeType === "sbt" ? "SBT Badge" : "Cast Your App Badge"}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  onClick={() => handleClaimClick(app)}
                  className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white"
                  size="sm"
                >
                  <Sparkles className="mr-2 h-3 w-3" />
                  Claim Badge
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Claimed Badges Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="h-5 w-5 text-yellow-400" />
          <h2 className="text-xl font-bold text-white">
            Your Badges ({claimedBadges.length})
          </h2>
        </div>
        {claimedBadges.length === 0 ? (
          <div className="text-center py-12 bg-[#1A1A1A] rounded-lg border border-gray-800">
            <Trophy className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">
              No badges claimed yet. Claim your first badge when your app gets approved!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {claimedBadges.map((badge) => (
              <div
                key={badge.id}
                className="bg-[#1A1A1A] rounded-lg border border-gray-800 p-4 hover:border-yellow-500/50 transition-colors"
              >
                <div className="aspect-square rounded-lg bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-blue-500/30 mb-3 flex items-center justify-center overflow-hidden">
                  {badge.imageUrl ? (
                    <Image
                      src={badge.imageUrl}
                      alt={badge.name}
                      width={200}
                      height={200}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <Trophy className="h-16 w-16 text-blue-400" />
                  )}
                </div>
                <h3 className="font-semibold text-white mb-1">{badge.appName}</h3>
                <p className="text-xs text-gray-400 mb-1">{badge.name}</p>
                {badge.badgeType && (
                  <p className="text-xs text-blue-400 mb-3">
                    {badge.badgeType === "sbt" ? "SBT Badge" : "Cast Your App Badge"}
                  </p>
                )}
                {badge.txHash && (
                  <a
                    href={`https://basescan.org/tx/${badge.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    View on BaseScan
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Badge Claim Modal */}
      <BadgeClaimModal
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) {
            handleClaimSuccess();
          }
        }}
        app={selectedApp}
      />
    </div>
  );
}

