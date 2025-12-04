"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AppHeader from "@/components/AppHeader";
import PageLoader from "@/components/PageLoader";
import ReferModal from "@/components/ReferModal";
import { Coins, Star, Rocket, CheckCircle2, ExternalLink, MessageSquare, Plus, Trophy, Users, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

interface Quest {
  id: string;
  title: string;
  description: string;
  points: number;
  icon: React.ReactNode;
  action?: {
    label: string;
    href: string;
  };
  completed?: boolean;
}

function QuestsPageContent() {
  const [wallet, setWallet] = useState<string | null>(null);
  const [points, setPoints] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReferModal, setShowReferModal] = useState(false);
  const [referralCount, setReferralCount] = useState(0);
  const [fid, setFid] = useState<string | null>(null);
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const searchParams = useSearchParams();

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/wallet", {
          method: "GET",
          credentials: "include",
        });

        if (res.ok) {
          const data = await res.json();
          if (data.wallet) {
            setWallet(data.wallet);
            if (data.fid) {
              setFid(String(data.fid));
            }
            
            // Fetch points
            try {
              const pointsRes = await fetch("/api/points", {
                credentials: "include",
              });
              if (pointsRes.ok) {
                const pointsData = await pointsRes.json();
                setPoints(pointsData.totalPoints || 0);
              }
            } catch (error) {
              console.error("Error fetching points:", error);
            }

            // Fetch referral count
            try {
              const refRes = await fetch("/api/referrals/count", {
                credentials: "include",
              });
              if (refRes.ok) {
                const refData = await refRes.json();
                setReferralCount(refData.converted || 0);
              }
            } catch (error) {
              console.error("Error fetching referral count:", error);
            }
          }
        }
      } catch (error) {
        console.error("Error checking auth:", error);
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, []);

  // Handle referral link from URL
  useEffect(() => {
    const refFid = searchParams?.get("ref");
    if (refFid && wallet) {
      // Track the referral click
      async function trackReferral() {
        try {
          const referralUrl = typeof window !== "undefined" ? window.location.href : "";
          await fetch("/api/referrals/track", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
              referrerFid: refFid,
              referrerWallet: null, // Will be filled if available
              referralUrl,
              referredWallet: wallet,
            }),
          });
        } catch (error) {
          console.error("Error tracking referral:", error);
        }
      }
      trackReferral();
    }
  }, [searchParams, wallet]);

  const quests: Quest[] = [
    {
      id: "refer",
      title: "Refer Friends",
      description: "Share your referral link and earn points when friends join and complete quests!",
      points: 50,
      icon: <Users className="w-6 h-6" />,
      action: {
        label: referralCount > 0 ? `${referralCount} Friends Joined` : "Refer Friends",
        href: "#",
      },
    },
    {
      id: "review",
      title: "Rate & Review Apps",
      description: "Submit a review for any app in the store. Help other users discover great apps!",
      points: 100,
      icon: <Star className="w-6 h-6" />,
      action: {
        label: "Browse Apps",
        href: "/apps",
      },
    },
    {
      id: "launch",
      title: "Launch an App",
      description: "Open and launch any mini app from the store. Explore new apps and earn points!",
      points: 10,
      icon: <Rocket className="w-6 h-6" />,
      action: {
        label: "Explore Apps",
        href: "/apps",
      },
    },
    {
      id: "submit",
      title: "Submit Your App",
      description: "Submit your mini app to the store. Get your app listed and help grow the ecosystem!",
      points: 50,
      icon: <Plus className="w-6 h-6" />,
      action: {
        label: "Submit App",
        href: "/submit",
      },
    },
  ];

  if (loading) {
    return <PageLoader message="Loading quests..." />;
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] pb-24">
      <AppHeader />
      <div className="pt-8 pb-8">
        <div className="max-w-screen-md mx-auto px-4">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold mb-2 flex items-center gap-3">
                  <Coins className="w-8 h-8 text-base-cyan" />
                  <span className="text-gradient-base">Quests</span>
                </h1>
                <p className="text-muted-foreground">
                  Complete quests to earn points and unlock rewards!
                </p>
              </div>
              <div className="flex items-center gap-3">
                {/* Points Display */}
                {points !== null && (
                  <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-base-cyan/10 border border-base-cyan/30">
                    <Coins className="w-5 h-5 text-base-cyan fill-base-cyan" />
                    <span className="text-lg font-bold text-base-cyan">
                      {points.toLocaleString()} <span className="text-sm">Points</span>
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Refer Friends Button - At the top */}
            {wallet && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.05 }}
                className="mb-4"
              >
                <button
                  onClick={() => setShowReferModal(true)}
                  className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-purple-600/20 via-blue-600/20 to-cyan-600/20 border border-purple-500/30 hover:border-purple-500/50 transition-all cursor-pointer group flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-purple-400 group-hover:text-purple-300 transition-colors" />
                    <span className="font-semibold text-white group-hover:text-purple-300 transition-colors">
                      Refer Friends
                    </span>
                    {referralCount > 0 && (
                      <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-full text-xs font-medium">
                        {referralCount} joined
                      </span>
                    )}
                  </div>
                  <ExternalLink className="w-4 h-4 text-purple-400 group-hover:text-purple-300 transition-colors" />
                </button>
              </motion.div>
            )}
            
            {/* View Your Ranking Bar */}
            <Link href="/ranking">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-base-blue/20 to-base-cyan/20 border border-base-blue/30 hover:border-base-blue/50 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Trophy className="w-5 h-5 text-base-blue group-hover:text-base-cyan transition-colors" />
                    <span className="font-semibold text-white group-hover:text-base-cyan transition-colors">
                      View Your Ranking
                    </span>
                  </div>
                  <ExternalLink className="w-4 h-4 text-base-blue group-hover:text-base-cyan transition-colors" />
                </div>
              </motion.div>
            </Link>
          </motion.div>

          {/* Quests List */}
          <div className="space-y-4">
            {quests.map((quest, index) => (
              <motion.div
                key={quest.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <Card className="glass-card border-white/10 hover:border-base-cyan/30 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-base-cyan/20 flex items-center justify-center text-base-cyan">
                        {quest.icon}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold mb-1">{quest.title}</h3>
                            <p className="text-sm text-muted-foreground mb-3">
                              {quest.description}
                            </p>
                          </div>
                          <div className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-base-cyan/10 border border-base-cyan/30">
                            <Coins className="w-4 h-4 text-base-cyan fill-base-cyan" />
                            <span className="text-sm font-bold text-base-cyan">
                              +{quest.points}
                            </span>
                          </div>
                        </div>

                        {/* Action Button */}
                        {quest.action && (
                          quest.id === "refer" ? (
                            <Button
                              onClick={() => setShowReferModal(true)}
                              variant="outline"
                              className="border-base-cyan/50 text-base-cyan hover:bg-base-cyan/10"
                            >
                              {quest.action.label}
                              <ExternalLink className="w-4 h-4 ml-2" />
                            </Button>
                          ) : (
                            <Link href={quest.action.href}>
                              <Button
                                variant="outline"
                                className="border-base-cyan/50 text-base-cyan hover:bg-base-cyan/10"
                              >
                                {quest.action.label}
                                <ExternalLink className="w-4 h-4 ml-2" />
                              </Button>
                            </Link>
                          )
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Info Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="mt-8"
          >
            <Card className="glass-card border-base-blue/30 bg-base-blue/5">
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <MessageSquare className="w-5 h-5 text-base-blue flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold mb-2">How Points Work</h3>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Points are automatically awarded when you complete quests</li>
                      <li>• Each quest can be completed multiple times (except app submission)</li>
                      <li>• Points accumulate in your account and can be used for future rewards</li>
                      <li>• Check your points balance in the top navigation bar</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Not Authenticated Message */}
          {!wallet && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.4 }}
              className="mt-8"
            >
              <Card className="glass-card border-yellow-500/30 bg-yellow-500/5">
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground mb-4">
                    Connect your wallet to start earning points!
                  </p>
                  <Link href="/dashboard">
                    <Button className="bg-base-blue hover:bg-base-blue/90">
                      Go to Dashboard
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </div>

      {/* Refer Modal */}
      <ReferModal
        isOpen={showReferModal}
        onClose={() => setShowReferModal(false)}
        referralCount={referralCount}
        onReferralCountUpdate={async () => {
          // Refresh referral count
          try {
            const refRes = await fetch("/api/referrals/count", {
              credentials: "include",
            });
            if (refRes.ok) {
              const refData = await refRes.json();
              setReferralCount(refData.converted || 0);
            }
          } catch (error) {
            console.error("Error fetching referral count:", error);
          }
        }}
      />
    </div>
  );
}

export default function QuestsPage() {
  return (
    <Suspense fallback={<PageLoader message="Loading quests..." />}>
      <QuestsPageContent />
    </Suspense>
  );
}

