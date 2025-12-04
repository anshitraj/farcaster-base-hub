"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import PageLoader from "@/components/PageLoader";
import AppHeader from "@/components/AppHeader";
import Sidebar from "@/components/Sidebar";
import { motion } from "framer-motion";
import { trackPageView } from "@/lib/analytics";
import { Trophy, Medal, Award, CheckCircle2 } from "lucide-react";
import VerifiedBadge from "@/components/VerifiedBadge";

export default function RankingPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [currentUserWallet, setCurrentUserWallet] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarHidden, setSidebarHidden] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
        setUsers(data.users || []);
      } catch (error) {
        console.error("Error fetching ranking:", error);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    }

    fetchRanking();
  }, []);

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-400 fill-yellow-400" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-300 fill-gray-300" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-600 fill-amber-600" />;
    return <span className="text-gray-400 font-bold w-5 text-center">{rank}</span>;
  };

  const getRankColor = (rank: number, isCurrentUser: boolean) => {
    if (isCurrentUser) return "bg-base-blue/20 border-base-blue/50";
    if (rank === 1) return "bg-yellow-500/10 border-yellow-500/30";
    if (rank === 2) return "bg-gray-400/10 border-gray-400/30";
    if (rank === 3) return "bg-amber-600/10 border-amber-600/30";
    return "bg-gray-900 border-gray-800";
  };

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
          ) : users.length > 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden"
            >
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-4 p-4 bg-gray-800/50 border-b border-gray-700 text-sm font-semibold text-gray-300">
                <div className="col-span-1 text-center">Rank</div>
                <div className="col-span-5">User</div>
                <div className="col-span-2 text-center">Points</div>
                <div className="col-span-2 text-center">XP</div>
                <div className="col-span-2 text-center">Level</div>
              </div>

              {/* Table Rows */}
              <div className="divide-y divide-gray-800">
                {users.map((user, index) => {
                  const rank = index + 1;
                  const displayName = user.name || "Anonymous";
                  const walletShort = user.wallet 
                    ? `${user.wallet.slice(0, 6)}...${user.wallet.slice(-4)}`
                    : "N/A";
                  const totalPoints = user.totalPoints || 0;
                  const totalXP = user.totalXP || 0;
                  const userLevel = user.developerLevel || 1;
                  const verified = user.verified || false;
                  const isCurrentUser = Boolean(currentUserWallet && user.wallet && user.wallet.toLowerCase() === currentUserWallet);

                  return (
                    <motion.div
                      key={user.wallet}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.05 }}
                      className={`grid grid-cols-12 gap-4 p-4 hover:bg-gray-800/50 transition-all duration-300 ${getRankColor(rank, isCurrentUser)} border-l-4 ${
                        rank <= 3 ? "border-l-4" : "border-l-transparent"
                      }`}
                    >
                      {/* Rank */}
                      <div className="col-span-1 flex items-center justify-center">
                        {getRankIcon(rank)}
                      </div>

                      {/* User Info */}
                      <div className="col-span-5 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center flex-shrink-0">
                          {user.avatar ? (
                            <img
                              src={user.avatar}
                              alt={displayName}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-base font-bold text-blue-400">
                              {displayName.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`font-semibold truncate ${isCurrentUser ? "text-base-blue" : "text-white"}`}>
                              {displayName}
                              {isCurrentUser && " (You)"}
                            </span>
                            {verified && (
                              <VerifiedBadge type="developer" iconOnly size="sm" />
                            )}
                          </div>
                          <p className="text-xs text-gray-400 font-mono truncate">
                            {walletShort}
                          </p>
                        </div>
                      </div>

                      {/* Points */}
                      <div className="col-span-2 flex items-center justify-center">
                        <span className={`font-semibold ${isCurrentUser ? "text-base-blue" : "text-blue-400"}`}>
                          {totalPoints.toLocaleString()}
                        </span>
                      </div>

                      {/* XP */}
                      <div className="col-span-2 flex items-center justify-center">
                        <span className="text-blue-400 font-semibold">{totalXP.toLocaleString()}</span>
                      </div>

                      {/* Level */}
                      <div className="col-span-2 flex items-center justify-center">
                        <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm font-semibold">
                          Lv.{userLevel}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
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

