"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AppHeader from "@/components/AppHeader";
import PageLoader from "@/components/PageLoader";
import { Coins, Star, Rocket, CheckCircle2, ExternalLink, MessageSquare, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

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

export default function QuestsPage() {
  const [wallet, setWallet] = useState<string | null>(null);
  const [points, setPoints] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

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

  const quests: Quest[] = [
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
              {points !== null && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-base-cyan/10 border border-base-cyan/30">
                  <Coins className="w-5 h-5 text-base-cyan fill-base-cyan" />
                  <span className="text-lg font-bold text-base-cyan">
                    {points.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
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
                          <Link href={quest.action.href}>
                            <Button
                              variant="outline"
                              className="border-base-cyan/50 text-base-cyan hover:bg-base-cyan/10"
                            >
                              {quest.action.label}
                              <ExternalLink className="w-4 h-4 ml-2" />
                            </Button>
                          </Link>
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
    </div>
  );
}

