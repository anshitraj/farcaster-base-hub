"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Award, ExternalLink, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

interface DashboardBadgesSectionProps {
  badges: any[];
  apps: any[];
  wallet: string | null;
}

interface BadgeClaimState {
  [appId: string]: {
    loading: boolean;
    claimed: boolean;
    txHash: string | null;
    badgeType?: "cast_your_app" | "sbt";
  };
}

interface AppWithBadgeType {
  id: string;
  name: string;
  iconUrl?: string;
  category?: string;
  badgeType: "cast_your_app" | "sbt"; // Type of badge for this app
}

export default function DashboardBadgesSection({ badges, apps, wallet }: DashboardBadgesSectionProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [claimStates, setClaimStates] = useState<BadgeClaimState>({});
  const [checkingClaims, setCheckingClaims] = useState(true);
  const [ownerApps, setOwnerApps] = useState<AppWithBadgeType[]>([]);
  const [loadingOwnerApps, setLoadingOwnerApps] = useState(true);

  // Fetch owner apps (for SBT badges)
  useEffect(() => {
    if (!wallet) {
      setLoadingOwnerApps(false);
      return;
    }

    async function fetchOwnerApps() {
      try {
        const response = await fetch("/api/badge/owner-apps", {
          credentials: "include",
        });
        
        if (response.ok) {
          const data = await response.json();
          const appsWithType: AppWithBadgeType[] = (data.apps || []).map((app: any) => ({
            ...app,
            badgeType: "sbt" as const,
          }));
          setOwnerApps(appsWithType);
        }
      } catch (error) {
        console.error("Error fetching owner apps:", error);
      } finally {
        setLoadingOwnerApps(false);
      }
    }

    fetchOwnerApps();
  }, [wallet]);

  // Initialize claim states from existing badges
  useEffect(() => {
    const allApps = [
      ...(apps || []).map((app: any) => ({ ...app, badgeType: "cast_your_app" as const })),
      ...ownerApps,
    ];

    if (allApps.length === 0) {
      setCheckingClaims(false);
      return;
    }

    const states: BadgeClaimState = {};
    
    allApps.forEach((app) => {
      // Check if badge exists in badges array
      const existingBadge = badges?.find((b: any) => b.appId === app.id);
      states[app.id] = {
        loading: false,
        claimed: !!existingBadge?.claimed && !!existingBadge?.txHash,
        txHash: existingBadge?.txHash || null,
        badgeType: app.badgeType,
      };
    });

    setClaimStates(states);
    setCheckingClaims(false);
  }, [badges, apps, ownerApps]);

  const handleClaimBadge = async (appId: string, appName: string, badgeType: "cast_your_app" | "sbt") => {
    if (!wallet) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to claim badges.",
        variant: "destructive",
      });
      return;
    }

    setClaimStates((prev) => ({
      ...prev,
      [appId]: { ...prev[appId], loading: true },
    }));

    try {
      let response;
      let data;

      if (badgeType === "cast_your_app") {
        // Use claim endpoint for CastYourApp badges
        response = await fetch("/api/badge/claim", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ appId }),
        });
        data = await response.json();
      } else {
        // Use mint endpoint for SBT badges
        response = await fetch("/api/badge/mint", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            developerWallet: wallet,
            appId,
            badgeType: "sbt",
          }),
        });
        data = await response.json();
      }

      if (!response.ok) {
        throw new Error(data.error || "Failed to claim badge");
      }

      // Update claim state
      setClaimStates((prev) => ({
        ...prev,
        [appId]: {
          loading: false,
          claimed: true,
          txHash: data.txHash || null,
          badgeType,
        },
      }));

      const badgeName = badgeType === "sbt" ? `${appName} SBT Badge` : `${appName} Builder Badge`;
      toast({
        title: "Badge claimed!",
        description: `Successfully claimed ${badgeName}`,
      });

      // Refresh the page to show updated badges
      router.refresh();
    } catch (error: any) {
      console.error("Claim badge error:", error);
      setClaimStates((prev) => ({
        ...prev,
        [appId]: { ...prev[appId], loading: false },
      }));

      toast({
        title: "Failed to claim badge",
        description: error.message || "An error occurred while claiming the badge.",
        variant: "destructive",
      });
    }
  };

  // Combine listed apps (CastYourApp badges) and owner apps (SBT badges)
  const listedApps: AppWithBadgeType[] = (apps || []).map((app: any) => ({
    ...app,
    badgeType: "cast_your_app" as const,
  }));

  const allAppsWithBadges = [...listedApps, ...ownerApps];

  if (allAppsWithBadges.length === 0 && !loadingOwnerApps) {
    return null;
  }

  // Calculate total badges (2 per app: normal + Claim Soon)
  const totalBadges = allAppsWithBadges.length * 2;

  return (
    <Card className="card-surface">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Award className="w-5 h-5 text-yellow-500" />
          Your Badges ({totalBadges})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {allAppsWithBadges.map((app) => {
            const claimState = claimStates[app.id] || { loading: false, claimed: false, txHash: null, badgeType: app.badgeType };
            const existingBadge = badges?.find((b: any) => b.appId === app.id);
            const isSBT = app.badgeType === "sbt";
            const badgeTitle = isSBT ? `Built ${app.name} on Base` : `${app.name} Builder Badge`;

            return (
              <div key={`app-${app.id}-${app.badgeType}`} className="space-y-4">
                {/* Normal Badge - CastYourApp SBT or Owner SBT */}
                <div className="p-4 rounded-lg bg-[#141A24] border border-[#1F2733] hover:border-[#2A2A2A] transition-colors text-center">
                  <div className="w-32 h-32 mx-auto mb-2 rounded-lg bg-gradient-to-br from-base-blue/20 to-base-cyan/20 flex items-center justify-center overflow-hidden">
                    <Image
                      src="/badges/castapp.webp"
                      alt={badgeTitle}
                      width={128}
                      height={128}
                      className="w-32 h-32 object-contain"
                      sizes="(max-width: 768px) 50vw, 25vw"
                      priority={false}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "/badges/castapp.webp";
                      }}
                    />
                  </div>
                  <p className="text-sm font-medium">{badgeTitle}</p>
                  <p className="text-xs text-muted-foreground mt-1">{app.name}</p>
                  
                  {/* Show View Tx if claimed, or Claim button if not */}
                  {claimState.claimed && claimState.txHash ? (
                    <a
                      href={`https://basescan.org/tx/${claimState.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-xs text-base-blue hover:text-base-cyan transition-colors"
                    >
                      View Tx
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <Button
                      onClick={() => handleClaimBadge(app.id, app.name, app.badgeType)}
                      disabled={claimState.loading || checkingClaims || loadingOwnerApps}
                      size="sm"
                      className="mt-2 w-full"
                      variant="outline"
                    >
                      {claimState.loading ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          Claiming...
                        </>
                      ) : (
                        "Claim"
                      )}
                    </Button>
                  )}
                </div>

                {/* Future Badge - Claim Soon */}
                <div
                  className="p-4 rounded-lg bg-[#141A24] border border-[#1F2733] text-center opacity-50 cursor-not-allowed"
                  style={{ opacity: 0.5 }}
                >
                  <div className="w-32 h-32 mx-auto mb-2 rounded-lg bg-gradient-to-br from-base-blue/20 to-base-cyan/20 flex items-center justify-center overflow-hidden opacity-60">
                    <Image
                      src="/badges/claimsoon.webp"
                      alt={`${app.name} Badge (Claim Soon)`}
                      width={128}
                      height={128}
                      className="w-32 h-32 object-contain"
                      sizes="(max-width: 768px) 50vw, 25vw"
                      priority={false}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "/badges/claimsoon.webp";
                      }}
                    />
                  </div>
                  <p className="text-sm font-medium">{app.name} Badge</p>
                  <p className="text-xs text-muted-foreground mt-1">Claim Soon</p>
                  <div className="mt-2">
                    <span className="text-xs text-muted-foreground/70 italic">Coming Soon</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
