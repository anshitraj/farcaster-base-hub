"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AppHeader from "@/components/AppHeader";
import PageLoader from "@/components/PageLoader";
import ReferModal from "@/components/ReferModal";
import { 
  Coins, Star, Rocket, CheckCircle2, ExternalLink, MessageSquare, Plus, Trophy, Users, Zap,
  Target, Award, Clock, TrendingUp, ChevronDown, ChevronUp, Sparkles, Gift, Flame
} from "lucide-react";
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
  progress?: number;
  maxProgress?: number;
  isDaily?: boolean;
  expiresAt?: Date;
}

interface Mission {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  gradient: string;
  quests: Quest[];
  progress: number;
  totalQuests: number;
  unlocked: boolean;
}

function QuestsPageContent() {
  const [wallet, setWallet] = useState<string | null>(null);
  const [points, setPoints] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReferModal, setShowReferModal] = useState(false);
  const [referralCount, setReferralCount] = useState(0);
  const [fid, setFid] = useState<string | null>(null);
  const [expandedMissions, setExpandedMissions] = useState<Set<string>>(new Set(["starter"]));
  const [userLevel, setUserLevel] = useState(1);
  const [nextMilestone, setNextMilestone] = useState(100);
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const searchParams = useSearchParams();

  // Calculate user level based on points
  useEffect(() => {
    if (points !== null) {
      // Level system: 100 points per level
      const level = Math.floor(points / 100) + 1;
      const nextMilestonePoints = level * 100;
      setUserLevel(level);
      setNextMilestone(nextMilestonePoints);
    }
  }, [points]);

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
              referrerWallet: null,
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

  const toggleMission = (missionId: string) => {
    setExpandedMissions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(missionId)) {
        newSet.delete(missionId);
      } else {
        newSet.add(missionId);
      }
      return newSet;
    });
  };

  // Mission-based quest structure
  const missions: Mission[] = [
    {
      id: "starter",
      title: "Starter Mission",
      description: "Begin your journey! Complete these quests to unlock your potential and earn your first rewards.",
      icon: <Sparkles className="w-5 h-5" />,
      color: "from-blue-500 to-cyan-500",
      gradient: "bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-blue-500/30",
      progress: 2,
      totalQuests: 3,
      unlocked: true,
      quests: [
        {
          id: "launch",
          title: "Launch an App",
          description: "Open and launch any mini app from the store. Explore new apps and earn points!",
          points: 10,
          icon: <Rocket className="w-5 h-5" />,
          action: {
            label: "Explore Apps",
            href: "/apps",
          },
          progress: 0,
          maxProgress: 1,
        },
        {
          id: "review",
          title: "Rate & Review Apps",
          description: "Submit a review for any app in the store. Help other users discover great apps!",
          points: 10,
          icon: <Star className="w-5 h-5" />,
          action: {
            label: "Browse Apps",
            href: "/apps",
          },
          progress: 0,
          maxProgress: 1,
        },
        {
          id: "save",
          title: "Save Your First App",
          description: "Save an app to your favorites list. Build your collection of favorite apps!",
          points: 5,
          icon: <Star className="w-5 h-5" />,
          action: {
            label: "Browse Apps",
            href: "/apps",
          },
          progress: 0,
          maxProgress: 1,
        },
      ],
    },
    {
      id: "social",
      title: "Community Builder",
      description: "Grow the community! Share, refer, and help others discover amazing apps. Unlock social rewards!",
      icon: <Users className="w-5 h-5" />,
      color: "from-purple-500 to-pink-500",
      gradient: "bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500/30",
      progress: referralCount > 0 ? 1 : 0,
      totalQuests: 2,
      unlocked: true,
      quests: [
        {
          id: "refer",
          title: "Refer Friends",
          description: "Share your referral link and earn points when friends join and complete quests!",
          points: 50,
          icon: <Users className="w-5 h-5" />,
          action: {
            label: referralCount > 0 ? `${referralCount} Friends Joined` : "Refer Friends",
            href: "#",
          },
          progress: referralCount,
          maxProgress: 1,
        },
        {
          id: "review",
          title: "Write Detailed Reviews",
          description: "Submit detailed reviews with ratings. Help the community make better choices!",
          points: 10,
          icon: <MessageSquare className="w-5 h-5" />,
          action: {
            label: "Browse Apps",
            href: "/apps",
          },
          progress: 0,
          maxProgress: 5,
        },
      ],
    },
    {
      id: "explorer",
      title: "Explorer Mission",
      description: "Discover new horizons! Launch multiple apps, explore categories, and become a true explorer.",
      icon: <Rocket className="w-5 h-5" />,
      color: "from-orange-500 to-red-500",
      gradient: "bg-gradient-to-r from-orange-500/20 to-red-500/20 border-orange-500/30",
      progress: 0,
      totalQuests: 3,
      unlocked: true,
      quests: [
        {
          id: "launch-multiple",
          title: "Launch 5 Apps",
          description: "Launch 5 different apps to become an explorer. Discover the diversity of the ecosystem!",
          points: 50,
          icon: <Rocket className="w-5 h-5" />,
          action: {
            label: "Explore Apps",
            href: "/apps",
          },
          progress: 0,
          maxProgress: 5,
        },
        {
          id: "submit",
          title: "Submit Your App",
          description: "Submit your mini app to the store. Get your app listed and help grow the ecosystem!",
          points: 1000,
          icon: <Plus className="w-5 h-5" />,
          action: {
            label: "Submit App",
            href: "/submit",
          },
          progress: 0,
          maxProgress: 1,
        },
        {
          id: "rate-multiple",
          title: "Rate 10 Apps",
          description: "Rate 10 different apps. Your feedback helps improve the ecosystem!",
          points: 100,
          icon: <Star className="w-5 h-5" />,
          action: {
            label: "Browse Apps",
            href: "/apps",
          },
          progress: 0,
          maxProgress: 10,
        },
      ],
    },
  ];

  // Daily quests
  const dailyQuests: Quest[] = [
    {
      id: "daily-launch",
      title: "Daily Launch",
      description: "Launch any app today to keep your streak going!",
      points: 10,
      icon: <Rocket className="w-5 h-5" />,
      action: {
        label: "Launch App",
        href: "/apps",
      },
      isDaily: true,
      progress: 0,
      maxProgress: 1,
    },
    {
      id: "daily-review",
      title: "Daily Review",
      description: "Write a review today and help the community!",
      points: 10,
      icon: <Star className="w-5 h-5" />,
      action: {
        label: "Browse Apps",
        href: "/apps",
      },
      isDaily: true,
      progress: 0,
      maxProgress: 1,
    },
  ];

  const progressPercentage = points !== null ? ((points % 100) / 100) * 100 : 0;
  const pointsToNextLevel = nextMilestone - (points || 0);

  if (loading) {
    return <PageLoader message="Loading quests..." />;
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] pb-24">
      <AppHeader />
      <div className="pt-8 pb-8">
        <div className="max-w-screen-md mx-auto px-4">
          {/* Header with Storytelling */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold mb-2 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                    <Target className="w-6 h-6 text-white" />
                  </div>
                  <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
                    Your Quest Journey
                  </span>
                </h1>
                <p className="text-gray-400 text-sm md:text-base">
                  Complete missions to level up from <span className="text-blue-400 font-semibold">Novice</span> to <span className="text-purple-400 font-semibold">Master</span>. 
                  Each quest brings you closer to unlocking exclusive rewards!
                </p>
              </div>
            </div>

            {/* Points Display with Progress Ring */}
            {points !== null && (
              <div className="bg-gradient-to-r from-blue-500/10 via-cyan-500/10 to-blue-500/10 border border-blue-500/30 rounded-2xl p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Total Points</p>
                    <p className="text-3xl font-bold text-white">
                      {points.toLocaleString()} <span className="text-lg text-gray-400">Points</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-400 mb-1">Level {userLevel}</p>
                    <div className="flex items-center gap-2">
                      <Award className="w-5 h-5 text-yellow-400" />
                      <span className="text-lg font-semibold text-yellow-400">
                        {userLevel === 1 ? "Novice" : userLevel < 5 ? "Explorer" : userLevel < 10 ? "Veteran" : "Master"}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Progress Bar to Next Level */}
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-400">Progress to Level {userLevel + 1}</span>
                    <span className="text-xs text-blue-400 font-medium">{pointsToNextLevel} points to go</span>
                  </div>
                  <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-500"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <button
                onClick={() => setShowReferModal(true)}
                className="px-4 py-3 rounded-xl bg-gradient-to-r from-purple-600/20 via-blue-600/20 to-cyan-600/20 border border-purple-500/30 hover:border-purple-500/50 transition-all cursor-pointer group flex items-center justify-between"
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
              
              <Link href="/ranking">
                <div className="px-4 py-3 rounded-xl bg-gradient-to-r from-base-blue/20 to-base-cyan/20 border border-base-blue/30 hover:border-base-blue/50 transition-all cursor-pointer group flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Trophy className="w-5 h-5 text-base-blue group-hover:text-base-cyan transition-colors" />
                    <span className="font-semibold text-white group-hover:text-base-cyan transition-colors">
                      View Leaderboard
                    </span>
                  </div>
                  <ExternalLink className="w-4 h-4 text-base-blue group-hover:text-base-cyan transition-colors" />
                </div>
              </Link>
            </div>
          </div>

          {/* Daily Quests Section */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-orange-400" />
              <h2 className="text-xl font-bold text-white">Daily Quests</h2>
              <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded-full text-xs font-medium">
                Resets in 24h
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dailyQuests.map((quest) => (
                <Card key={quest.id} className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/30 hover:border-orange-500/50 transition-colors">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/30 to-red-500/30 flex items-center justify-center text-orange-400">
                        {quest.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex-1">
                            <h3 className="text-base font-semibold mb-1 text-white">{quest.title}</h3>
                            <p className="text-xs text-gray-400 mb-3">{quest.description}</p>
                          </div>
                          <div className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500/20 border border-orange-500/30">
                            <Coins className="w-4 h-4 text-orange-400" />
                            <span className="text-sm font-bold text-orange-400">+{quest.points}</span>
                          </div>
                        </div>
                        {quest.progress !== undefined && quest.maxProgress !== undefined && (
                          <div className="mb-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-gray-400">Progress</span>
                              <span className="text-xs text-orange-400 font-medium">
                                {quest.progress}/{quest.maxProgress}
                              </span>
                            </div>
                            <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full transition-all duration-300"
                                style={{ width: `${(quest.progress / quest.maxProgress) * 100}%` }}
                              />
                            </div>
                          </div>
                        )}
                        {quest.action && (
                          quest.id === "refer" ? (
                            <Button
                              onClick={() => setShowReferModal(true)}
                              variant="outline"
                              size="sm"
                              className="w-full border-orange-500/50 text-orange-400 hover:bg-orange-500/10"
                            >
                              {quest.action.label}
                              <ExternalLink className="w-4 h-4 ml-2" />
                            </Button>
                          ) : (
                            <Link href={quest.action.href} className="block">
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full border-orange-500/50 text-orange-400 hover:bg-orange-500/10"
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
              ))}
            </div>
          </div>

          {/* Mission-Based Quests */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-400" />
              Missions
            </h2>
            
            {missions.map((mission) => {
              const isExpanded = expandedMissions.has(mission.id);
              const missionProgress = (mission.progress / mission.totalQuests) * 100;
              
              return (
                <Card key={mission.id} className={`${mission.gradient} border transition-all`}>
                  <CardContent className="p-0">
                    {/* Mission Header */}
                    <button
                      onClick={() => toggleMission(mission.id)}
                      className="w-full p-5 flex items-center justify-between hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${mission.color} flex items-center justify-center text-white flex-shrink-0`}>
                          {mission.icon}
                        </div>
                        <div className="flex-1 text-left">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-lg font-bold text-white">{mission.title}</h3>
                            {mission.unlocked ? (
                              <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full text-xs font-medium">
                                Active
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-gray-500/20 text-gray-400 rounded-full text-xs font-medium">
                                Locked
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-300 mb-2">{mission.description}</p>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-400">Progress:</span>
                              <span className="text-sm font-semibold text-white">
                                {mission.progress}/{mission.totalQuests} quests
                              </span>
                            </div>
                            <div className="w-32 h-2 bg-gray-800 rounded-full overflow-hidden">
                              <div 
                                className={`h-full bg-gradient-to-r ${mission.color} rounded-full transition-all duration-300`}
                                style={{ width: `${missionProgress}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0 ml-4" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0 ml-4" />
                      )}
                    </button>

                    {/* Mission Quests */}
                    {isExpanded && (
                      <div className="px-5 pb-5 space-y-3 border-t border-white/10 pt-4">
                        {mission.quests.map((quest) => {
                          const questProgress = quest.progress !== undefined && quest.maxProgress !== undefined
                            ? (quest.progress / quest.maxProgress) * 100
                            : 0;
                          const isCompleted = quest.progress !== undefined && quest.maxProgress !== undefined
                            ? quest.progress >= quest.maxProgress
                            : false;

                          return (
                            <Card key={quest.id} className="bg-black/20 border-white/10 hover:border-white/20 transition-colors">
                              <CardContent className="p-4">
                                <div className="flex items-start gap-4">
                                  <div className={`flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br ${mission.color} flex items-center justify-center text-white`}>
                                    {quest.icon}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-4 mb-2">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                          <h4 className="text-base font-semibold text-white">{quest.title}</h4>
                                          {isCompleted && (
                                            <CheckCircle2 className="w-4 h-4 text-green-400" />
                                          )}
                                        </div>
                                        <p className="text-xs text-gray-400 mb-3">{quest.description}</p>
                                      </div>
                                      <div className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/20 border border-blue-500/30">
                                        <Coins className="w-4 h-4 text-blue-400" />
                                        <span className="text-sm font-bold text-blue-400">+{quest.points}</span>
                                      </div>
                                    </div>
                                    
                                    {quest.progress !== undefined && quest.maxProgress !== undefined && (
                                      <div className="mb-3">
                                        <div className="flex items-center justify-between mb-1">
                                          <span className="text-xs text-gray-400">Progress</span>
                                          <span className="text-xs text-blue-400 font-medium">
                                            {quest.progress}/{quest.maxProgress}
                                          </span>
                                        </div>
                                        <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                                          <div 
                                            className={`h-full bg-gradient-to-r ${mission.color} rounded-full transition-all duration-300`}
                                            style={{ width: `${questProgress}%` }}
                                          />
                                        </div>
                                      </div>
                                    )}

                                    {quest.action && (
                                      quest.id === "refer" ? (
                                        <Button
                                          onClick={() => setShowReferModal(true)}
                                          variant="outline"
                                          size="sm"
                                          className="w-full border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                                          disabled={isCompleted}
                                        >
                                          {quest.action.label}
                                          <ExternalLink className="w-4 h-4 ml-2" />
                                        </Button>
                                      ) : (
                                        <Link href={quest.action.href} className="block">
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                                            disabled={isCompleted}
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
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Info Card */}
          <Card className="mt-8 bg-blue-500/5 border-blue-500/30">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <MessageSquare className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold mb-2 text-white">How Quests Work</h3>
                  <ul className="text-sm text-gray-400 space-y-1">
                    <li>• Complete quests to earn points and level up</li>
                    <li>• Daily quests reset every 24 hours</li>
                    <li>• Mission progress unlocks new challenges</li>
                    <li>• Higher levels unlock exclusive rewards and badges</li>
                    <li>• Check your ranking on the leaderboard</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Not Authenticated Message */}
          {!wallet && (
            <Card className="mt-8 bg-yellow-500/5 border-yellow-500/30">
              <CardContent className="p-6 text-center">
                <p className="text-gray-400 mb-4">
                  Connect your wallet to start earning points and unlock quests!
                </p>
                <Link href="/dashboard">
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    Go to Dashboard
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Refer Modal */}
      <ReferModal
        isOpen={showReferModal}
        onClose={() => setShowReferModal(false)}
        referralCount={referralCount}
        onReferralCountUpdate={async () => {
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
