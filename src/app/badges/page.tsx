"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { Award, CheckCircle2, Clock, Loader2, ExternalLink, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import AppHeader from "@/components/AppHeader";
import { useAccount } from "wagmi";
import { optimizeDevImage } from "@/utils/optimizeDevImage";

interface EarnedBadge {
  id: string;
  name: string;
  imageUrl: string;
  appName: string;
  appId: string | null;
  badgeType: string;
  txHash: string | null;
  claimed: boolean;
  claimedAt: Date | null;
  app: {
    id: string;
    name: string;
    iconUrl: string | null;
    category: string | null;
    url: string | null;
  } | null;
}

interface ClaimableApp {
  id: string;
  name: string;
  description: string | null;
  iconUrl: string | null;
  category: string | null;
  url: string | null;
  createdAt: Date | null;
}

export default function BadgesPage() {
  const [earned, setEarned] = useState<EarnedBadge[]>([]);
  const [claimable, setClaimable] = useState<ClaimableApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();
  const { address, isConnected } = useAccount();

  useEffect(() => {
    fetchBadges();
  }, []);

  const fetchBadges = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/badge/all", {
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 401) {
          toast({
            title: "Authentication required",
            description: "Please connect your wallet to view badges",
            variant: "destructive",
          });
          router.push("/login");
          return;
        }
        throw new Error("Failed to fetch badges");
      }

      const data = await res.json();
      setEarned(data.earned || []);
      setClaimable(data.claimable || []);
    } catch (error) {
      console.error("Error fetching badges:", error);
      toast({
        title: "Error",
        description: "Failed to load badges. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async (appId: string) => {
    if (claiming) return;

    try {
      setClaiming(appId);
      const res = await fetch("/api/badge/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ appId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to claim badge");
      }

      toast({
        title: "Badge claimed! 🎉",
        description: "Your badge has been successfully claimed.",
      });

      // Refresh badges
      await fetchBadges();
    } catch (error: any) {
      toast({
        title: "Claim failed",
        description: error.message || "Failed to claim badge. Please try again.",
        variant: "destructive",
      });
    } finally {
      setClaiming(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="w-8 h-8 animate-spin text-base-blue" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
              <Award className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Your Badges</h1>
              <p className="text-muted-foreground">
                Earn badges by building and publishing mini apps on Base
              </p>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Card className="glass-card border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Earned</p>
                  <p className="text-2xl font-bold">{earned.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Available to Claim</p>
                  <p className="text-2xl font-bold">{claimable.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Earned Badges Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-12"
        >
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <h2 className="text-2xl font-bold">Earned Badges</h2>
            <Badge variant="secondary" className="ml-2">
              {earned.length}
            </Badge>
          </div>

          {earned.length === 0 ? (
            <Card className="glass-card border-white/10">
              <CardContent className="p-12 text-center">
                <Award className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground mb-2">No badges earned yet</p>
                <p className="text-sm text-muted-foreground">
                  Get your first badge by publishing and getting an app approved!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {earned.map((badge, index) => (
                <motion.div
                  key={badge.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="glass-card hover:bg-white/10 transition-all duration-300 border-white/10 hover:border-base-blue/50 group">
                    <CardContent className="p-6">
                      <div className="flex flex-col items-center text-center">
                        {/* Badge Image */}
                        <div className="relative mb-4">
                          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-base-blue/20 to-base-cyan/20 flex items-center justify-center overflow-hidden">
                            {badge.imageUrl ? (
                              <Image
                                src={optimizeDevImage(badge.imageUrl)}
                                alt={badge.name}
                                width={96}
                                height={96}
                                className="w-24 h-24 object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = "/placeholder.svg";
                                }}
                              />
                            ) : (
                              <Award className="w-12 h-12 text-base-blue" />
                            )}
                          </div>
                          <div className="absolute -top-1 -right-1">
                            <CheckCircle2 className="w-6 h-6 text-green-500 bg-background rounded-full" />
                          </div>
                        </div>

                        {/* Badge Info */}
                        <h3 className="font-semibold text-lg mb-1">{badge.name}</h3>
                        <p className="text-sm text-muted-foreground mb-3">{badge.appName}</p>

                        {/* App Link */}
                        {badge.app?.url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full"
                            onClick={() => window.open(badge.app!.url!, "_blank")}
                          >
                            View App
                            <ExternalLink className="w-3 h-3 ml-1" />
                          </Button>
                        )}

                        {/* Transaction Hash */}
                        {badge.txHash && (
                          <a
                            href={`https://basescan.org/tx/${badge.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-muted-foreground hover:text-base-blue mt-2 flex items-center gap-1"
                          >
                            View on BaseScan
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Claimable Badges Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-blue-500" />
            <h2 className="text-2xl font-bold">Available to Claim</h2>
            <Badge variant="secondary" className="ml-2">
              {claimable.length}
            </Badge>
          </div>

          {claimable.length === 0 ? (
            <Card className="glass-card border-white/10">
              <CardContent className="p-12 text-center">
                <Sparkles className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground mb-2">No badges available to claim</p>
                <p className="text-sm text-muted-foreground">
                  Get your apps approved to unlock new badges!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {claimable.map((app, index) => (
                <motion.div
                  key={app.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="glass-card hover:bg-white/10 transition-all duration-300 border-white/10 hover:border-base-blue/50 group">
                    <CardContent className="p-6">
                      <div className="flex flex-col items-center text-center">
                        {/* App Icon */}
                        <div className="relative mb-4">
                          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-base-blue/20 to-base-cyan/20 flex items-center justify-center overflow-hidden">
                            {app.iconUrl ? (
                              <Image
                                src={optimizeDevImage(app.iconUrl)}
                                alt={app.name}
                                width={96}
                                height={96}
                                className="w-24 h-24 object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = "/placeholder.svg";
                                }}
                              />
                            ) : (
                              <Award className="w-12 h-12 text-base-blue" />
                            )}
                          </div>
                          <div className="absolute -top-1 -right-1">
                            <Clock className="w-6 h-6 text-blue-500 bg-background rounded-full" />
                          </div>
                        </div>

                        {/* App Info */}
                        <h3 className="font-semibold text-lg mb-1">{app.name}</h3>
                        {app.description && (
                          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                            {app.description}
                          </p>
                        )}

                        {/* Claim Button */}
                        <Button
                          onClick={() => handleClaim(app.id)}
                          disabled={claiming === app.id}
                          className="w-full bg-gradient-to-r from-base-blue to-base-cyan hover:opacity-90"
                        >
                          {claiming === app.id ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                              Claiming...
                            </>
                          ) : (
                            <>
                              <Award className="w-4 h-4 mr-2" />
                              Claim Badge
                            </>
                          )}
                        </Button>

                        {/* App Link */}
                        {app.url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full mt-2"
                            onClick={() => window.open(app.url!, "_blank")}
                          >
                            View App
                            <ExternalLink className="w-3 h-3 ml-1" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

