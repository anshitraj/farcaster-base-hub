"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Medal, Award, TrendingUp, Star, Download } from "lucide-react";
import { motion } from "framer-motion";
import { trackPageView } from "@/lib/analytics";
import PageLoader from "@/components/PageLoader";
import VerifiedBadge from "@/components/VerifiedBadge";
import RatingStars from "@/components/RatingStars";

export default function TopAppsPage() {
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("trending");

  useEffect(() => {
    trackPageView("/top");
    fetchRankedApps();
  }, [sortBy]);

  async function fetchRankedApps() {
    setLoading(true);
    try {
      const res = await fetch(`/api/apps/ranked?sort=${sortBy}`, {
        credentials: "include",
      });
      const data = await res.json();
      setApps(data.apps || []);
    } catch (error) {
      console.error("Error fetching ranked apps:", error);
    } finally {
      setLoading(false);
    }
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
    return null;
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return "text-yellow-500 font-bold";
    if (rank === 2) return "text-gray-400 font-bold";
    if (rank === 3) return "text-amber-600 font-bold";
    if (rank <= 10) return "text-base-blue font-semibold";
    return "text-muted-foreground";
  };

  if (loading) {
    return <PageLoader message="Loading top applications..." />;
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] pb-24">
      <div className="pt-20 pb-8">
        <div className="max-w-screen-md mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-6"
          >
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-6 h-6 text-yellow-500" />
              <h1 className="text-2xl md:text-3xl font-bold">
                Top Applications
              </h1>
            </div>
            <p className="text-muted-foreground text-sm mb-4">
              All applications ranked by performance
            </p>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full glass-card focus:ring-base-blue border-white/10">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="glass-card border-white/10">
                <SelectItem value="trending">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Trending
                  </div>
                </SelectItem>
                <SelectItem value="rating">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4" />
                    Highest Rated
                  </div>
                </SelectItem>
                <SelectItem value="installs">
                  <div className="flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Most Installs
                  </div>
                </SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
              </SelectContent>
            </Select>
          </motion.div>

          {apps.length > 0 ? (
            <div className="space-y-3">
              {apps.map((app, index) => (
                <motion.div
                  key={app.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <Link href={`/apps/${app.id}`}>
                    <Card className="glass-card hover:bg-white/10 transition-colors cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          {/* Rank Badge */}
                          <div className="flex-shrink-0 w-12 flex items-center justify-center">
                            {getRankIcon(app.rank) || (
                              <span
                                className={`text-lg font-bold ${getRankColor(
                                  app.rank
                                )}`}
                              >
                                #{app.rank}
                              </span>
                            )}
                          </div>

                          {/* App Icon */}
                          <div className="flex-shrink-0">
                            {app.iconUrl ? (
                              <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-white/5 border border-white/10">
                                <Image
                                  src={app.iconUrl}
                                  alt={app.name}
                                  fill
                                  className="object-cover"
                                  sizes="56px"
                                />
                              </div>
                            ) : (
                              <div className="w-14 h-14 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                                <Award className="w-6 h-6 text-muted-foreground" />
                              </div>
                            )}
                          </div>

                          {/* App Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-sm truncate">
                                {app.name}
                              </h3>
                              {app.verified && (
                                <VerifiedBadge type="app" size="sm" />
                              )}
                            </div>
                            {app.developer && (
                              <p className="text-xs text-muted-foreground truncate mb-1">
                                {app.developer.name || "Unknown Developer"}
                              </p>
                            )}
                            <div className="flex items-center gap-3 mt-2">
                              {app.ratingAverage > 0 && (
                                <div className="flex items-center gap-1">
                                  <RatingStars
                                    rating={app.ratingAverage}
                                    size={14}
                                  />
                                  <span className="text-xs text-muted-foreground">
                                    ({app.ratingCount || 0})
                                  </span>
                                </div>
                              )}
                              {app.installs > 0 && (
                                <div className="flex items-center gap-1">
                                  <Download className="w-3 h-3 text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground">
                                    {app.installs.toLocaleString()}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Score/Stats */}
                          <div className="flex-shrink-0 text-right">
                            {sortBy === "trending" && (
                              <div className="text-xs text-muted-foreground">
                                Score
                              </div>
                            )}
                            {sortBy === "rating" && (
                              <div className="text-xs text-muted-foreground">
                                Rating
                              </div>
                            )}
                            {sortBy === "installs" && (
                              <div className="text-xs text-muted-foreground">
                                Installs
                              </div>
                            )}
                            <div className="text-sm font-semibold text-base-blue">
                              {sortBy === "trending"
                                ? (app.score ? ((app.score % 1 === 0) ? app.score.toString() : app.score.toFixed(1)) : "0")
                                : sortBy === "rating"
                                ? ((app.ratingAverage % 1 === 0) ? app.ratingAverage.toString() : app.ratingAverage.toFixed(1))
                                : app.installs.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <p className="text-muted-foreground">No applications found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

