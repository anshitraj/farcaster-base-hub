"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import PageLoader from "@/components/PageLoader";
import AppHeader from "@/components/AppHeader";
import { motion } from "framer-motion";
import { trackPageView } from "@/lib/analytics";
import { Trophy, Medal, Award, CheckCircle2 } from "lucide-react";
import VerifiedBadge from "@/components/VerifiedBadge";

export default function DevelopersPage() {
  const [developers, setDevelopers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    trackPageView("/developers");
  }, []);

  useEffect(() => {
    async function fetchDevelopers() {
      try {
        const res = await fetch("/api/developers?limit=100&sort=apps", {
          credentials: "include",
        });
        
        if (!res.ok) {
          throw new Error("Failed to fetch developers");
        }
        
        const data = await res.json();
        // Sort by total apps, then by total XP
        const sorted = (data.developers || []).sort((a: any, b: any) => {
          const aApps = a.appCount || 0;
          const bApps = b.appCount || 0;
          if (bApps !== aApps) return bApps - aApps;
          return (b.totalXP || 0) - (a.totalXP || 0);
        });
        setDevelopers(sorted);
      } catch (error) {
        console.error("Error fetching developers:", error);
        setDevelopers([]);
      } finally {
        setLoading(false);
      }
    }

    fetchDevelopers();
  }, []);

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-400 fill-yellow-400" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-300 fill-gray-300" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-600 fill-amber-600" />;
    return <span className="text-gray-400 font-bold w-5 text-center">{rank}</span>;
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return "bg-yellow-500/10 border-yellow-500/30";
    if (rank === 2) return "bg-gray-400/10 border-gray-400/30";
    if (rank === 3) return "bg-amber-600/10 border-amber-600/30";
    return "bg-gray-900 border-gray-800";
  };

  return (
    <div className="min-h-screen bg-black pb-24">
      <AppHeader />
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
                Top Developers
              </span>
            </h1>
            <p className="text-gray-400 text-sm">
              Meet the builders creating amazing mini apps
            </p>
          </motion.div>

          {loading ? (
            <PageLoader message="Loading developers..." />
          ) : developers.length > 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden"
            >
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-4 p-4 bg-gray-800/50 border-b border-gray-700 text-sm font-semibold text-gray-300">
                <div className="col-span-1 text-center">Rank</div>
                <div className="col-span-4">Developer</div>
                <div className="col-span-2 text-center">Apps</div>
                <div className="col-span-2 text-center">XP</div>
                <div className="col-span-2 text-center">Level</div>
                <div className="col-span-1 text-center">Status</div>
              </div>

              {/* Table Rows */}
              <div className="divide-y divide-gray-800">
                {developers
                  .filter((dev) => dev && dev.wallet)
                  .map((dev, index) => {
                    const rank = index + 1;
                    const displayName = dev.name || "Anonymous";
                    const walletShort = dev.wallet 
                      ? `${dev.wallet.slice(0, 6)}...${dev.wallet.slice(-4)}`
                      : "N/A";
                    const appCount = dev.appCount || 0;
                    const totalXP = dev.totalXP || 0;
                    const developerLevel = dev.developerLevel || 1;
                    const verified = dev.verified || false;

                    return (
                      <motion.div
                        key={dev.wallet || dev.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, delay: index * 0.05 }}
                        className={`grid grid-cols-12 gap-4 p-4 hover:bg-gray-800/50 transition-all duration-300 ${getRankColor(rank)} border-l-4 ${
                          rank <= 3 ? "border-l-4" : "border-l-transparent"
                        }`}
                      >
                        {/* Rank */}
                        <div className="col-span-1 flex items-center justify-center">
                          {getRankIcon(rank)}
                        </div>

                        {/* Developer Info */}
                        <div className="col-span-4 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center flex-shrink-0">
                            {dev.avatar ? (
                              <img
                                src={dev.avatar}
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
                              <Link
                                href={`/developers/${dev.wallet}`}
                                className="font-semibold text-white hover:text-blue-400 transition-colors truncate"
                              >
                                {displayName}
                              </Link>
                              {verified && (
                                <VerifiedBadge type="developer" iconOnly size="sm" />
                              )}
                            </div>
                            <p className="text-xs text-gray-400 font-mono truncate">
                              {walletShort}
                            </p>
                          </div>
                        </div>

                        {/* Apps Count */}
                        <div className="col-span-2 flex items-center justify-center">
                          <span className="text-white font-semibold">{appCount}</span>
                        </div>

                        {/* XP */}
                        <div className="col-span-2 flex items-center justify-center">
                          <span className="text-blue-400 font-semibold">{totalXP.toLocaleString()}</span>
                        </div>

                        {/* Level */}
                        <div className="col-span-2 flex items-center justify-center">
                          <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm font-semibold">
                            Lv.{developerLevel}
                          </span>
                        </div>

                        {/* Status */}
                        <div className="col-span-1 flex items-center justify-center">
                          {verified ? (
                            <CheckCircle2 className="w-5 h-5 text-green-400" />
                          ) : (
                            <span className="w-2 h-2 rounded-full bg-gray-600" />
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
              </div>
            </motion.div>
          ) : (
            <div className="text-center py-20">
              <p className="text-gray-400 mb-4">No developers found yet</p>
              <p className="text-sm text-gray-500">
                Be the first to submit a mini app!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
