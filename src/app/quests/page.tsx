"use client";

import { useState, useEffect, Suspense, useMemo, useCallback, memo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AppHeader from "@/components/AppHeader";
import Sidebar from "@/components/Sidebar";
import PageLoader from "@/components/PageLoader";
import dynamic from "next/dynamic";
import { 
  Star, Rocket, CheckCircle2, ExternalLink, MessageSquare, Plus, Trophy, Users, Zap,
  Target, Award, Clock, TrendingUp, ChevronDown, ChevronUp, Sparkles, Gift, Flame, Crown
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { getRankFromLevel, getRankColor } from "@/lib/rank-utils";

// Lazy load heavy components
const ReferModal = dynamic(() => import("@/components/ReferModal"), {
  loading: () => null,
  ssr: false
});

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
  const [questProgress, setQuestProgress] = useState<Record<string, any>>({});
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarHidden, setSidebarHidden] = useState(false);
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const searchParams = useSearchParams();

  // Initialize sidebar state based on screen size
  useEffect(() => {
    const checkMobile = () => {
      if (typeof window !== 'undefined') {
        if (window.innerWidth >= 1024) {
          // On desktop, always open by default
          setSidebarOpen(true);
        } else {
          // On mobile, check localStorage or default to closed
          const savedSidebarState = localStorage.getItem('sidebarOpen');
          if (savedSidebarState !== null) {
            setSidebarOpen(savedSidebarState === 'true');
          } else {
            setSidebarOpen(false);
          }
        }
      }
    };
    
    if (typeof window !== 'undefined') {
      checkMobile();
    }
    
    const handleResize = () => {
      if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
        // Always show on desktop
        setSidebarOpen(true);
      }
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  // Save sidebar state to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebarOpen', String(sidebarOpen));
    }
  }, [sidebarOpen]);

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

  // Combined API call - fetch all data in one request
  const fetchQuestData = useCallback(async () => {
    try {
      const res = await fetch("/api/quests/all", {
        method: "GET",
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        if (data.wallet) {
          setWallet(data.wallet);
          setPoints(data.points || 0);
          setReferralCount(data.referralCount || 0);
          setQuestProgress(data.quests || {});
        }
      }
    } catch (error) {
      console.error("Error fetching quest data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuestData();
    
    // Refresh quest data every 10 seconds (less frequent than before)
    const interval = setInterval(() => {
      fetchQuestData();
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchQuestData]);

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

  const toggleMission = useCallback((missionId: string) => {
    setExpandedMissions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(missionId)) {
        newSet.delete(missionId);
      } else {
        newSet.add(missionId);
      }
      return newSet;
    });
  }, []);

  const handleSidebarChange = useCallback((collapsed: boolean, hidden: boolean) => {
    setSidebarCollapsed(collapsed);
    setSidebarHidden(hidden);
  }, []);

  // Mission-based quest structure - memoized to prevent recalculation
  const missions: Mission[] = useMemo(() => [
    {
      id: "starter",
      title: "Starter Mission",
      description: "Begin your journey! Complete these quests to unlock your potential and earn your first rewards.",
      icon: <Sparkles className="w-5 h-5" />,
      color: "from-blue-500 to-cyan-500",
      gradient: "bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-blue-500/30",
      progress: (() => {
        // Calculate progress dynamically based on completed quests
        const launchCompleted = questProgress.launch?.completed ?? false;
        const reviewCompleted = questProgress.review?.completed ?? false;
        const saveCompleted = questProgress.save?.completed ?? false;
        return [launchCompleted, reviewCompleted, saveCompleted].filter(Boolean).length;
      })(),
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
          progress: questProgress.launch?.progress ?? 0,
          maxProgress: questProgress.launch?.maxProgress ?? 1,
          completed: questProgress.launch?.completed ?? false,
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
          progress: questProgress.review?.progress ?? 0,
          maxProgress: questProgress.review?.maxProgress ?? 1,
          completed: questProgress.review?.completed ?? false,
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
          progress: questProgress.save?.progress ?? 0,
          maxProgress: questProgress.save?.maxProgress ?? 1,
          completed: questProgress.save?.completed ?? false,
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
      progress: (() => {
        // Calculate progress dynamically based on completed quests
        const launchMultipleCompleted = questProgress["launch-multiple"]?.completed ?? false;
        const submitCompleted = questProgress.submit?.completed ?? false;
        const rateMultipleCompleted = questProgress["rate-multiple"]?.completed ?? false;
        return [launchMultipleCompleted, submitCompleted, rateMultipleCompleted].filter(Boolean).length;
      })(),
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
          progress: questProgress["launch-multiple"]?.progress ?? 0,
          maxProgress: questProgress["launch-multiple"]?.maxProgress ?? 5,
          completed: questProgress["launch-multiple"]?.completed ?? false,
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
          progress: questProgress.submit?.progress ?? 0,
          maxProgress: questProgress.submit?.maxProgress ?? 1,
          completed: questProgress.submit?.completed ?? false,
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
          progress: questProgress["rate-multiple"]?.progress ?? 0,
          maxProgress: questProgress["rate-multiple"]?.maxProgress ?? 10,
          completed: questProgress["rate-multiple"]?.completed ?? false,
        },
      ],
    },
  ], [questProgress, referralCount]);

  // Daily quests - memoized
  const dailyQuests: Quest[] = useMemo(() => [
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
      progress: questProgress["daily-launch"]?.progress ?? 0,
      maxProgress: questProgress["daily-launch"]?.maxProgress ?? 1,
      completed: questProgress["daily-launch"]?.completed ?? false,
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
      progress: questProgress["daily-review"]?.progress ?? 0,
      maxProgress: questProgress["daily-review"]?.maxProgress ?? 1,
      completed: questProgress["daily-review"]?.completed ?? false,
    },
  ], [questProgress]);

  const progressPercentage = useMemo(() => {
    return points !== null ? ((points % 100) / 100) * 100 : 0;
  }, [points]);
  
  const pointsToNextLevel = useMemo(() => {
    return nextMilestone - (points || 0);
  }, [nextMilestone, points]);

  if (loading) {
    return <PageLoader message="Loading quests..." />;
  }

  return (
    <div className="flex min-h-screen bg-[#0B0F19]">
      <Sidebar 
        onCollapseChange={handleSidebarChange}
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
      />
      <main className={`flex-1 min-h-screen w-full pb-20 lg:pb-0 transition-all duration-300 ${
        sidebarHidden 
          ? "ml-0" 
          : sidebarCollapsed 
            ? "lg:ml-16 ml-0" 
            : "lg:ml-64 ml-0"
      }`}>
        <AppHeader onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <div className="pt-4 md:pt-8 pb-8">
        <div className="max-w-screen-md mx-auto px-3 md:px-4">
          {/* Header with Storytelling */}
          <div className="mb-4 md:mb-8">
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <div>
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-1 md:mb-2 flex items-center gap-2 md:gap-3">
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                    <Target className="w-4 h-4 md:w-6 md:h-6 text-white" />
                  </div>
                  <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
                    Your Quest Journey
                  </span>
                </h1>
                <p className="text-gray-400 text-xs md:text-sm lg:text-base">
                  Complete missions to level up from <span className="text-blue-400 font-semibold">Novice</span> to <span className="text-purple-400 font-semibold">Master</span>. 
                  Each quest brings you closer to unlocking exclusive rewards!
                </p>
              </div>
            </div>

            {/* Points Display with Progress Ring */}
            {points !== null && (
              <div className="bg-gradient-to-r from-blue-500/10 via-cyan-500/10 to-blue-500/10 border border-blue-500/30 rounded-xl md:rounded-2xl p-3 md:p-6 mb-4 md:mb-6">
                <div className="flex items-center justify-between mb-3 md:mb-4">
                  <div>
                    <p className="text-xs md:text-sm text-gray-400 mb-0.5 md:mb-1">Total Points</p>
                    <p className="text-xl md:text-2xl lg:text-3xl font-bold text-white">
                      {points.toLocaleString()} <span className="text-sm md:text-lg text-gray-400">Points</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs md:text-sm text-gray-400 mb-0.5 md:mb-1">Level {userLevel}</p>
                    <div className="flex items-center gap-1.5 md:gap-2">
                      <Award className="w-4 h-4 md:w-5 md:h-5 text-yellow-400" />
                      <span className={`text-sm md:text-lg font-semibold ${getRankColor(getRankFromLevel(userLevel))}`}>
                        {getRankFromLevel(userLevel)}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Progress Bar to Next Level */}
                <div className="mt-3 md:mt-4">
                  <div className="flex items-center justify-between mb-1.5 md:mb-2">
                    <span className="text-xs text-gray-400">Progress to Level {userLevel + 1}</span>
                    <span className="text-xs text-blue-400 font-medium">{pointsToNextLevel} points to go</span>
                  </div>
                  <div className="w-full h-2 md:h-3 bg-gray-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-500"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-4 md:mb-6">
              <button
                onClick={() => setShowReferModal(true)}
                className="px-3 py-2 md:px-4 md:py-3 rounded-lg md:rounded-xl bg-gradient-to-r from-purple-600/20 via-blue-600/20 to-cyan-600/20 border border-purple-500/30 hover:border-purple-500/50 transition-all cursor-pointer group flex items-center justify-between"
              >
                <div className="flex items-center gap-2 md:gap-3">
                  <Users className="w-4 h-4 md:w-5 md:h-5 text-purple-400 group-hover:text-purple-300 transition-colors" />
                  <span className="text-sm md:text-base font-semibold text-white group-hover:text-purple-300 transition-colors">
                    Refer Friends
                  </span>
                  {referralCount > 0 && (
                    <span className="px-1.5 py-0.5 md:px-2 bg-purple-500/20 text-purple-300 rounded-full text-xs font-medium">
                      {referralCount} joined
                    </span>
                  )}
                </div>
                <ExternalLink className="w-3 h-3 md:w-4 md:h-4 text-purple-400 group-hover:text-purple-300 transition-colors" />
              </button>
              
              <Link href="/ranking">
                <div className="px-3 py-2 md:px-4 md:py-3 rounded-lg md:rounded-xl bg-gradient-to-r from-base-blue/20 to-base-cyan/20 border border-base-blue/30 hover:border-base-blue/50 transition-all cursor-pointer group flex items-center justify-between">
                  <div className="flex items-center gap-2 md:gap-3">
                    <Trophy className="w-4 h-4 md:w-5 md:h-5 text-base-blue group-hover:text-base-cyan transition-colors" />
                    <span className="text-sm md:text-base font-semibold text-white group-hover:text-base-cyan transition-colors">
                      View Leaderboard
                    </span>
                  </div>
                  <ExternalLink className="w-3 h-3 md:w-4 md:h-4 text-base-blue group-hover:text-base-cyan transition-colors" />
                </div>
              </Link>
            </div>
          </div>

          {/* Daily Quests Section */}
          <div className="mb-6 md:mb-8">
            <div className="flex items-center gap-2 mb-3 md:mb-4">
              <Clock className="w-4 h-4 md:w-5 md:h-5 text-orange-400" />
              <h2 className="text-lg md:text-xl font-bold text-white">Daily Quests</h2>
              <span className="px-1.5 py-0.5 md:px-2 bg-orange-500/20 text-orange-400 rounded-full text-xs font-medium">
                Resets in 24h
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              {dailyQuests.map((quest) => (
                <Card key={quest.id} className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/30 hover:border-orange-500/50 transition-colors">
                  <CardContent className="p-3 md:p-4 lg:p-5">
                    <div className="flex items-start gap-3 md:gap-4">
                      <div className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-gradient-to-br from-orange-500/30 to-red-500/30 flex items-center justify-center text-orange-400">
                        {quest.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 md:gap-4 mb-1.5 md:mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 md:gap-2 mb-1">
                              <h3 className="text-sm md:text-base font-semibold text-white truncate">{quest.title}</h3>
                              {quest.completed && (
                                <CheckCircle2 className="w-3.5 h-3.5 md:w-4 md:h-4 text-green-400 flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-gray-400 mb-2 md:mb-3 line-clamp-2">{quest.description}</p>
                          </div>
                          <div className="flex-shrink-0 flex items-center gap-1 md:gap-1.5 px-2 py-1 md:px-3 md:py-1.5 rounded-lg bg-orange-500/20 border border-orange-500/30">
                            <Image 
                              src={process.env.NEXT_PUBLIC_POINTS_IMAGE_URL || "https://9ous0xezrwvbetof.public.blob.vercel-storage.com/static/points.webp"} 
                              alt="Points" 
                              width={16} 
                              height={16} 
                              className="w-3.5 h-3.5 md:w-4 md:h-4"
                            />
                            <span className="text-xs md:text-sm font-bold text-orange-400">+{quest.points}</span>
                          </div>
                        </div>
                        {quest.progress !== undefined && quest.maxProgress !== undefined && (
                          <div className="mb-2 md:mb-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-gray-400">Progress</span>
                              <span className="text-xs text-orange-400 font-medium">
                                {quest.progress}/{quest.maxProgress}
                              </span>
                            </div>
                            <div className="w-full h-1.5 md:h-2 bg-gray-800 rounded-full overflow-hidden">
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
                              className="w-full text-xs md:text-sm border-orange-500/50 text-orange-400 hover:bg-orange-500/10 h-8 md:h-9"
                              disabled={quest.completed}
                            >
                              {quest.completed ? "Completed" : quest.action.label}
                              <ExternalLink className="w-3 h-3 md:w-4 md:h-4 ml-1.5 md:ml-2" />
                            </Button>
                          ) : (
                            <Link href={quest.action.href} className="block">
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full text-xs md:text-sm border-orange-500/50 text-orange-400 hover:bg-orange-500/10 h-8 md:h-9"
                                disabled={quest.completed}
                              >
                                {quest.completed ? "Completed" : quest.action.label}
                                <ExternalLink className="w-3 h-3 md:w-4 md:h-4 ml-1.5 md:ml-2" />
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
          <div className="space-y-3 md:space-y-4">
            <h2 className="text-lg md:text-xl font-bold text-white mb-3 md:mb-4 flex items-center gap-2">
              <Target className="w-4 h-4 md:w-5 md:h-5 text-blue-400" />
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
                      className="w-full p-3 md:p-4 lg:p-5 flex items-center justify-between hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
                        <div className={`w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-gradient-to-br ${mission.color} flex items-center justify-center text-white flex-shrink-0`}>
                          {mission.icon}
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <div className="flex items-center gap-2 md:gap-3 mb-1 flex-wrap">
                            <h3 className="text-base md:text-lg font-bold text-white">{mission.title}</h3>
                            {mission.unlocked ? (
                              <span className="px-1.5 py-0.5 md:px-2 bg-green-500/20 text-green-400 rounded-full text-xs font-medium flex-shrink-0">
                                Active
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 md:px-2 bg-gray-500/20 text-gray-400 rounded-full text-xs font-medium flex-shrink-0">
                                Locked
                              </span>
                            )}
                          </div>
                          <p className="text-xs md:text-sm text-gray-300 mb-1.5 md:mb-2 line-clamp-2">{mission.description}</p>
                          <div className="flex items-center gap-2 md:gap-4 flex-wrap">
                            <div className="flex items-center gap-1.5 md:gap-2">
                              <span className="text-xs text-gray-400">Progress:</span>
                              <span className="text-xs md:text-sm font-semibold text-white">
                                {mission.progress}/{mission.totalQuests} quests
                              </span>
                            </div>
                            <div className="w-24 md:w-32 h-1.5 md:h-2 bg-gray-800 rounded-full overflow-hidden">
                              <div 
                                className={`h-full bg-gradient-to-r ${mission.color} rounded-full transition-all duration-300`}
                                style={{ width: `${missionProgress}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 md:w-5 md:h-5 text-gray-400 flex-shrink-0 ml-2 md:ml-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4 md:w-5 md:h-5 text-gray-400 flex-shrink-0 ml-2 md:ml-4" />
                      )}
                    </button>

                    {/* Mission Quests */}
                    {isExpanded && (
                      <div className="px-3 md:px-4 lg:px-5 pb-3 md:pb-4 lg:pb-5 space-y-2 md:space-y-3 border-t border-white/10 pt-3 md:pt-4">
                        {mission.quests.map((quest) => {
                          const questProgress = quest.progress !== undefined && quest.maxProgress !== undefined
                            ? (quest.progress / quest.maxProgress) * 100
                            : 0;
                          const isCompleted = quest.progress !== undefined && quest.maxProgress !== undefined
                            ? quest.progress >= quest.maxProgress
                            : false;

                          return (
                            <Card key={quest.id} className="bg-black/20 border-white/10 hover:border-white/20 transition-colors">
                              <CardContent className="p-3 md:p-4">
                                <div className="flex items-start gap-3 md:gap-4">
                                  <div className={`flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-lg bg-gradient-to-br ${mission.color} flex items-center justify-center text-white`}>
                                    {quest.icon}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2 md:gap-4 mb-1.5 md:mb-2">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5 md:gap-2 mb-1">
                                          <h4 className="text-sm md:text-base font-semibold text-white truncate">{quest.title}</h4>
                                          {isCompleted && (
                                            <CheckCircle2 className="w-3.5 h-3.5 md:w-4 md:h-4 text-green-400 flex-shrink-0" />
                                          )}
                                        </div>
                                        <p className="text-xs text-gray-400 mb-2 md:mb-3 line-clamp-2">{quest.description}</p>
                                      </div>
                                      <div className="flex-shrink-0 flex items-center gap-1 md:gap-1.5 px-2 py-1 md:px-3 md:py-1.5 rounded-lg bg-blue-500/20 border border-blue-500/30">
                                        <Image 
                                          src={process.env.NEXT_PUBLIC_POINTS_IMAGE_URL || "https://9ous0xezrwvbetof.public.blob.vercel-storage.com/static/points.webp"} 
                                          alt="Points" 
                                          width={16} 
                                          height={16} 
                                          className="w-3.5 h-3.5 md:w-4 md:h-4"
                                        />
                                        <span className="text-xs md:text-sm font-bold text-blue-400">+{quest.points}</span>
                                      </div>
                                    </div>
                                    
                                    {quest.progress !== undefined && quest.maxProgress !== undefined && (
                                      <div className="mb-2 md:mb-3">
                                        <div className="flex items-center justify-between mb-1">
                                          <span className="text-xs text-gray-400">Progress</span>
                                          <span className="text-xs text-blue-400 font-medium">
                                            {quest.progress}/{quest.maxProgress}
                                          </span>
                                        </div>
                                        <div className="w-full h-1.5 md:h-2 bg-gray-800 rounded-full overflow-hidden">
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
                                          className="w-full text-xs md:text-sm border-blue-500/50 text-blue-400 hover:bg-blue-500/10 h-8 md:h-9"
                                          disabled={isCompleted}
                                        >
                                          {quest.action.label}
                                          <ExternalLink className="w-3 h-3 md:w-4 md:h-4 ml-1.5 md:ml-2" />
                                        </Button>
                                      ) : (
                                        <Link href={quest.action.href} className="block">
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full text-xs md:text-sm border-blue-500/50 text-blue-400 hover:bg-blue-500/10 h-8 md:h-9"
                                            disabled={isCompleted}
                                          >
                                            {quest.action.label}
                                            <ExternalLink className="w-3 h-3 md:w-4 md:h-4 ml-1.5 md:ml-2" />
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
          <Card className="mt-6 md:mt-8 bg-blue-500/5 border-blue-500/30">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-start gap-2 md:gap-3">
                <MessageSquare className="w-4 h-4 md:w-5 md:h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm md:text-base font-semibold mb-1.5 md:mb-2 text-white">How Quests Work</h3>
                  <ul className="text-xs md:text-sm text-gray-400 space-y-0.5 md:space-y-1">
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

          {/* Ranking Details Section */}
          <Card className="mt-6 md:mt-8 bg-gradient-to-br from-purple-500/10 via-blue-500/10 to-cyan-500/10 border-purple-500/30">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-start gap-2 md:gap-3 mb-4 md:mb-6">
                <Trophy className="w-5 h-5 md:w-6 md:h-6 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-base md:text-lg lg:text-xl font-semibold mb-1 md:mb-2 text-white">Ranking System</h3>
                  <p className="text-xs md:text-sm text-gray-400">
                    Your rank is determined by your level, which increases as you earn points. Each level requires 100 points.
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                {/* Iron */}
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 md:p-4">
                  <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gray-600 flex items-center justify-center">
                      <span className="text-xs font-bold text-gray-300">I</span>
                    </div>
                    <div>
                      <h4 className="text-sm md:text-base font-semibold text-gray-500">Iron</h4>
                      <p className="text-xs text-gray-400">Levels 1-4</p>
                    </div>
                  </div>
                </div>

                {/* Bronze */}
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 md:p-4">
                  <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-orange-600 flex items-center justify-center">
                      <span className="text-xs font-bold text-white">B</span>
                    </div>
                    <div>
                      <h4 className="text-sm md:text-base font-semibold text-orange-400">Bronze</h4>
                      <p className="text-xs text-gray-400">Levels 5-9</p>
                    </div>
                  </div>
                </div>

                {/* Silver */}
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 md:p-4">
                  <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gray-300 flex items-center justify-center">
                      <span className="text-xs font-bold text-gray-800">S</span>
                    </div>
                    <div>
                      <h4 className="text-sm md:text-base font-semibold text-gray-300">Silver</h4>
                      <p className="text-xs text-gray-400">Levels 10-14</p>
                    </div>
                  </div>
                </div>

                {/* Gold */}
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 md:p-4">
                  <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-yellow-500 flex items-center justify-center">
                      <span className="text-xs font-bold text-white">G</span>
                    </div>
                    <div>
                      <h4 className="text-sm md:text-base font-semibold text-yellow-400">Gold</h4>
                      <p className="text-xs text-gray-400">Levels 15-19</p>
                    </div>
                  </div>
                </div>

                {/* Diamond */}
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 md:p-4">
                  <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-blue-500 flex items-center justify-center">
                      <span className="text-xs font-bold text-white">D</span>
                    </div>
                    <div>
                      <h4 className="text-sm md:text-base font-semibold text-blue-400">Diamond</h4>
                      <p className="text-xs text-gray-400">Levels 20-29</p>
                    </div>
                  </div>
                </div>

                {/* Platinum */}
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 md:p-4">
                  <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-cyan-500 flex items-center justify-center">
                      <span className="text-xs font-bold text-white">P</span>
                    </div>
                    <div>
                      <h4 className="text-sm md:text-base font-semibold text-cyan-400">Platinum</h4>
                      <p className="text-xs text-gray-400">Levels 30-39</p>
                    </div>
                  </div>
                </div>

                {/* Ascendant */}
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 md:p-4">
                  <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-pink-500 flex items-center justify-center">
                      <span className="text-xs font-bold text-white">A</span>
                    </div>
                    <div>
                      <h4 className="text-sm md:text-base font-semibold text-pink-400">Ascendant</h4>
                      <p className="text-xs text-gray-400">Levels 40-49</p>
                    </div>
                  </div>
                </div>

                {/* Master */}
                <div className="bg-gray-800/50 border border-purple-500/50 rounded-lg p-3 md:p-4">
                  <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-purple-500 flex items-center justify-center">
                      <Crown className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" />
                    </div>
                    <div>
                      <h4 className="text-sm md:text-base font-semibold text-purple-400">Master</h4>
                      <p className="text-xs text-gray-400">Level 50+</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 md:mt-6 p-3 md:p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-xs md:text-sm text-gray-300">
                  <span className="font-semibold text-blue-400">Current Rank:</span>{" "}
                  <span className={getRankColor(getRankFromLevel(userLevel))}>
                    {getRankFromLevel(userLevel)}
                  </span>{" "}
                  (Level {userLevel})
                </p>
                {userLevel < 50 && (() => {
                  let nextRankLevel = 0;
                  let nextRank = "";
                  if (userLevel < 5) {
                    nextRankLevel = 5;
                    nextRank = "Bronze";
                  } else if (userLevel < 10) {
                    nextRankLevel = 10;
                    nextRank = "Silver";
                  } else if (userLevel < 15) {
                    nextRankLevel = 15;
                    nextRank = "Gold";
                  } else if (userLevel < 20) {
                    nextRankLevel = 20;
                    nextRank = "Diamond";
                  } else if (userLevel < 30) {
                    nextRankLevel = 30;
                    nextRank = "Platinum";
                  } else if (userLevel < 40) {
                    nextRankLevel = 40;
                    nextRank = "Ascendant";
                  } else if (userLevel < 50) {
                    nextRankLevel = 50;
                    nextRank = "Master";
                  }
                  return nextRankLevel > 0 ? (
                    <p className="text-xs text-gray-400 mt-1.5 md:mt-2">
                      Next rank: <span className={getRankColor(nextRank)}>{nextRank}</span> at Level {nextRankLevel}
                    </p>
                  ) : null;
                })()}
              </div>
            </CardContent>
          </Card>

          {/* Not Authenticated Message */}
          {!wallet && (
            <Card className="mt-6 md:mt-8 bg-yellow-500/5 border-yellow-500/30">
              <CardContent className="p-4 md:p-6 text-center">
                <p className="text-sm md:text-base text-gray-400 mb-3 md:mb-4">
                  Connect your wallet to start earning points and unlock quests!
                </p>
                <Link href="/dashboard">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-sm md:text-base">
                    Go to Dashboard
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
        </div>
      </main>

      {/* Refer Modal */}
      <ReferModal
        isOpen={showReferModal}
        onClose={() => setShowReferModal(false)}
        referralCount={referralCount}
        onReferralCountUpdate={async () => {
          // Refresh all quest data using combined endpoint
          await fetchQuestData();
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
