"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import PageLoader from "@/components/PageLoader";
import AppHeader from "@/components/AppHeader";
import Sidebar from "@/components/Sidebar";
import { motion, AnimatePresence } from "framer-motion";
import { trackPageView } from "@/lib/analytics";
import { Trophy, Medal, Award, CheckCircle2, X, Zap, ChevronDown } from "lucide-react";
import VerifiedBadge from "@/components/VerifiedBadge";
import { useMiniApp } from "@/components/MiniAppProvider";
import { getRankFromLevel, getRankColor } from "@/lib/rank-utils";

export default function RankingPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [currentUserWallet, setCurrentUserWallet] = useState<string | null>(null);
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarHidden, setSidebarHidden] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user: miniAppUser } = useMiniApp();

  // On desktop, sidebar should always be visible (isOpen = true)
  // On mobile, it starts closed
  useEffect(() => {
    const checkMobile = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true); // Always open on desktop
      } else {
        setSidebarOpen(false); // Closed by default on mobile
      }
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleSidebarChange = (collapsed: boolean, hidden: boolean) => {
    setSidebarCollapsed(collapsed);
    setSidebarHidden(hidden);
  };

  useEffect(() => {
    trackPageView("/ranking");
  }, []);

  useEffect(() => {
    async function fetchRanking() {
      try {
        // Fetch current user wallet
        const authRes = await fetch("/api/auth/wallet", {
          credentials: "include",
        });
        if (authRes.ok) {
          const authData = await authRes.json();
          if (authData.wallet) {
            setCurrentUserWallet(authData.wallet.toLowerCase());
          }
        }

        // Fetch ranking
        const res = await fetch("/api/ranking?limit=100", {
          credentials: "include",
        });
        
        if (!res.ok) {
          throw new Error("Failed to fetch ranking");
        }
        
        const data = await res.json();
        let fetchedUsers = data.users || [];
        
        // Enhance user data with Base names and avatars if missing
        fetchedUsers = await Promise.all(
          fetchedUsers.map(async (user: any) => {
            const isFarcaster = user.wallet?.startsWith('farcaster:');
            
            // Fetch Base name and avatar for Base wallets
            if (!isFarcaster && user.wallet) {
              try {
                const baseRes = await fetch(`/api/base/profile?wallet=${encodeURIComponent(user.wallet)}`, {
                  credentials: "include",
                });
                if (baseRes.ok) {
                  const baseData = await baseRes.json();
                  if (baseData.baseEthName || (baseData.name && baseData.name.includes('.base.eth'))) {
                    user.baseName = baseData.baseEthName || baseData.name;
                    if (!user.name || user.name.includes('...')) {
                      user.name = user.baseName;
                    }
                  }
                  // Update avatar from Base profile if available
                  if (baseData.avatar && (!user.avatar || user.avatar.includes('dicebear'))) {
                    user.avatar = baseData.avatar;
                  }
                }
              } catch (e) {
                console.error("Error fetching Base profile:", e);
              }
            }
            
            // Fetch Farcaster avatar if missing
            if (isFarcaster && (!user.avatar || user.avatar.includes('dicebear'))) {
              const fidMatch = user.wallet.match(/^farcaster:(\d+)$/);
              if (fidMatch) {
                try {
                  const fid = fidMatch[1];
                  const fcRes = await fetch(`/api/farcaster/resolve-eth-address?fid=${fid}`, {
                    credentials: "include",
                  });
                  if (fcRes.ok) {
                    const fcData = await fcRes.json();
                    // Try to fetch Farcaster user data via Neynar
                    if (fcData.ethAddress) {
                      // For now, try to get avatar from developer profile
                      // The API should have already fetched it, but we can try again
                    }
                  }
                  
                  // Try direct Neynar API call for avatar
                  try {
                    const neynarRes = await fetch(
                      `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`,
                      {
                        headers: {
                          "apikey": process.env.NEXT_PUBLIC_NEYNAR_API_KEY || "",
                          "Content-Type": "application/json",
                        },
                      }
                    );
                    if (neynarRes.ok) {
                      const neynarData = await neynarRes.json();
                      const fcUser = neynarData.users?.[0];
                      if (fcUser?.pfp_url) {
                        user.avatar = fcUser.pfp_url;
                      }
                    }
                  } catch (neynarError) {
                    console.error("Error fetching Farcaster avatar:", neynarError);
                  }
                } catch (e) {
                  console.error("Error fetching Farcaster profile:", e);
                }
              }
            }
            
            // Fallback: Generate avatar if still missing
            if (!user.avatar || user.avatar.includes('dicebear')) {
              if (isFarcaster) {
                user.avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.wallet}&backgroundColor=ffffff&hairColor=77311d`;
              } else {
                user.avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.wallet}&backgroundColor=b6e3f4,c0aede,d1d4f9&hairColor=77311d,4a312c`;
              }
            }
            
            return user;
          })
        );
        
        // Find current user's rank
        if (currentUserWallet) {
          const userIndex = fetchedUsers.findIndex((u: any) => 
            u.wallet && u.wallet.toLowerCase() === currentUserWallet
          );
          if (userIndex !== -1) {
            setCurrentUserRank(userIndex + 1);
          }
        }
        
        setUsers(fetchedUsers);
      } catch (error) {
        console.error("Error fetching ranking:", error);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    }

    fetchRanking();
  }, []);

  const getRankDisplay = (rank: number) => {
    if (rank === 1) {
      return (
        <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center">
          <Trophy className="w-5 h-5 text-white fill-white" />
        </div>
      );
    }
    if (rank === 2) {
      return (
        <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
          <Medal className="w-5 h-5 text-white fill-white" />
        </div>
      );
    }
    if (rank === 3) {
      return (
        <div className="w-8 h-8 rounded-full bg-amber-600 flex items-center justify-center">
          <Medal className="w-5 h-5 text-white fill-white" />
        </div>
      );
    }
    return (
      <span className="text-gray-400 font-bold text-sm">#{rank}</span>
    );
  };

  // Generate temporary username from wallet address
  const generateTempUsername = (wallet: string): string => {
    if (!wallet) return "User";
    // Use last 4 characters of wallet to create a unique username
    const last4 = wallet.slice(-4).toLowerCase();
    const adjectives = ["Cool", "Swift", "Bold", "Bright", "Sharp", "Quick", "Smart", "Fast", "Bold", "Epic"];
    const nouns = ["User", "Player", "Hero", "Star", "Champ", "Pro", "Ace", "Elite", "Master", "Legend"];
    const adjIndex = parseInt(last4.slice(0, 1), 16) % adjectives.length;
    const nounIndex = parseInt(last4.slice(1, 2), 16) % nouns.length;
    return `${adjectives[adjIndex]}${nouns[nounIndex]}${last4.slice(2)}`;
  };

  const sortedUsers = [...users].sort((a, b) => {
    return (b.totalPoints || 0) - (a.totalPoints || 0);
  });

  // Get top 3 and current user entry
  const topUsers = sortedUsers.slice(0, 3);
  const currentUserEntry = currentUserWallet 
    ? sortedUsers.find((u: any) => u.wallet && u.wallet.toLowerCase() === currentUserWallet)
    : null;
  const currentUserIndex = currentUserWallet 
    ? sortedUsers.findIndex((u: any) => u.wallet && u.wallet.toLowerCase() === currentUserWallet)
    : -1;

  return (
    <div className="flex min-h-screen bg-black">
      {/* Sidebar */}
      <Sidebar 
        onCollapseChange={handleSidebarChange}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content */}
      <main className={`flex-1 min-h-screen w-full pb-20 lg:pb-0 transition-all duration-300 ${
        sidebarHidden 
          ? "ml-0" 
          : sidebarCollapsed 
            ? "lg:ml-16 ml-0" 
            : "lg:ml-64 ml-0"
      }`}>
        <AppHeader onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <div className="pt-8 pb-8">
        <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-center mb-8"
          >
            <h1 className="text-3xl md:text-4xl font-extrabold mb-2">
              <span className="bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 bg-clip-text text-transparent">
                User Rankings
              </span>
            </h1>
            <p className="text-gray-400 text-sm">
              See where you rank among all users based on your points
            </p>
          </motion.div>

          {loading ? (
            <PageLoader message="Loading rankings..." />
          ) : sortedUsers.length > 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-2xl"
            >
              {/* Leaderboard Header */}
              <div className="bg-gray-800/50 border-b border-gray-700 p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                  <h2 className="text-xl font-bold text-white">Leaderboard</h2>
                </div>
                <div className="flex items-center gap-3">
                  {/* Points Label */}
                  <span className="text-sm font-medium text-gray-300">Points</span>
                </div>
              </div>

              {/* Current User Entry (Highlighted) */}
              {currentUserEntry && currentUserIndex >= 0 && (() => {
                const points = currentUserEntry.totalPoints || 0;
                const level = Math.floor(points / 100) + 1;
                const userRank = getRankFromLevel(level);
                const rankColor = getRankColor(userRank);
                return (
                  <div className="px-4 pt-4">
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-green-500/10 border-l-4 border-green-500 p-4 rounded-lg"
                    >
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0">
                        {getRankDisplay(currentUserIndex + 1)}
                      </div>
                      <div className="flex-shrink-0">
                        {currentUserEntry.avatar ? (
                          <Image
                            src={currentUserEntry.avatar}
                            alt={currentUserEntry.name || "You"}
                            width={48}
                            height={48}
                            className="rounded-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUserEntry.wallet}&backgroundColor=b6e3f4,c0aede,d1d4f9&hairColor=77311d,4a312c`;
                            }}
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center">
                            <span className="text-lg font-bold text-gray-300">
                              {(currentUserEntry.name || "U").charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">You</span>
                          {currentUserEntry.verified && (
                            <VerifiedBadge type="developer" iconOnly size="sm" />
                          )}
                        </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Zap className="w-3 h-3 text-green-400 fill-green-400" />
                        <span className="text-xs text-gray-400">
                          {currentUserEntry.streak || 0} {currentUserEntry.streak === 1 ? 'day' : 'days'} streak
                        </span>
                      </div>
                        <div className="mt-1">
                          <span className={`text-xs font-bold ${rankColor}`} style={{ fontFamily: 'monospace' }}>
                            {userRank}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-400 text-lg">
                          {points.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-400">points</div>
                      </div>
                    </div>
                    </motion.div>
                  </div>
                );
              })()}

              {/* Top 3 Users */}
              <div className="px-4 pb-4 space-y-3">
                {topUsers.map((user, index) => {
                  const rank = index + 1;
                  // Generate temp username if no name found
                  const displayName = user.name || user.baseName || (user.wallet ? generateTempUsername(user.wallet) : "User");
                  const points = user.totalPoints || 0;
                  // Calculate level: 100 points per level
                  const level = Math.floor(points / 100) + 1;
                  const userRank = getRankFromLevel(level);
                  const rankColor = getRankColor(userRank);
                  
                  return (
                    <motion.div
                      key={user.wallet}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                      className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 hover:bg-gray-800 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0">
                          {getRankDisplay(rank)}
                        </div>
                        <div className="flex-shrink-0">
                          {user.avatar ? (
                            <Image
                              src={user.avatar}
                              alt={displayName}
                              width={48}
                              height={48}
                              className="rounded-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.wallet}&backgroundColor=b6e3f4,c0aede,d1d4f9&hairColor=77311d,4a312c`;
                              }}
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center">
                              <span className="text-lg font-bold text-gray-300">
                                {displayName.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white truncate">
                              {user.baseName 
                                ? `@${user.baseName.toLowerCase().replace('.base.eth', '').toUpperCase()}.base.eth`
                                : displayName}
                            </span>
                            {user.verified && (
                              <VerifiedBadge type="developer" iconOnly size="sm" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Zap className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                            <span className="text-xs text-gray-400">
                              {user.streak || 0} {user.streak === 1 ? 'day' : 'days'} streak
                            </span>
                          </div>
                          <div className="mt-1">
                            <span className={`text-xs font-bold ${rankColor}`} style={{ fontFamily: 'monospace' }}>
                              {userRank}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-white text-lg">
                            {points.toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-400">points</div>
                          {rank <= 3 && (
                            <div className="flex items-center gap-1 mt-1 justify-end">
                              <span className="text-xs font-bold text-yellow-400">5x</span>
                              <Trophy className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* More Users (if current user is not in top 3) */}
              {currentUserIndex >= 3 && (
                <div className="px-4 pb-4 space-y-2 border-t border-gray-700 pt-4">
                  <p className="text-xs text-gray-400 font-medium mb-2">More Rankings</p>
                  {sortedUsers.slice(3, 10).map((user, index) => {
                    const rank = index + 4;
                    // Generate temp username if no name found
                    const displayName = user.name || user.baseName || (user.wallet ? generateTempUsername(user.wallet) : "User");
                    const points = user.totalPoints || 0;
                    
                    return (
                      <div
                        key={user.wallet}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800 transition-colors"
                      >
                        <div className="flex-shrink-0 w-6 text-xs text-gray-400 font-medium">
                          #{rank}
                        </div>
                        <div className="flex-shrink-0">
                          {user.avatar ? (
                            <Image
                              src={user.avatar}
                              alt={displayName}
                              width={32}
                              height={32}
                              className="rounded-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.wallet}&backgroundColor=b6e3f4,c0aede,d1d4f9&hairColor=77311d,4a312c`;
                              }}
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                              <span className="text-xs font-bold text-gray-300">
                                {displayName.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-white truncate block">
                            {user.baseName 
                              ? `@${user.baseName.toLowerCase().replace('.base.eth', '').toUpperCase()}.base.eth`
                              : displayName}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-semibold text-gray-300">
                            {points.toLocaleString()}
                          </span>
                          <div className="text-xs text-gray-400">points</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          ) : (
            <div className="text-center py-20">
              <p className="text-gray-400 mb-4">No users found yet</p>
              <p className="text-sm text-gray-500">
                Start earning points by completing quests!
              </p>
            </div>
          )}
        </div>
        </div>
      </main>
    </div>
  );
}

