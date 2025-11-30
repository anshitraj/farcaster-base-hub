"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import AppHeader from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Trophy, TrendingUp, Star, ExternalLink } from "lucide-react";
import RatingStars from "@/components/RatingStars";
import VerifiedBadge from "@/components/VerifiedBadge";
import FavoriteButton from "@/components/FavoriteButton";
import { trackPageView } from "@/lib/analytics";

export default function TrendingAppsPage() {
  const router = useRouter();
  const [trendingApps, setTrendingApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    trackPageView("/apps/trending");
    fetchTrendingApps();
  }, []);

  async function fetchTrendingApps() {
    try {
      setLoading(true);
      const res = await fetch("/api/apps/trending/ranked", {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setTrendingApps(data.apps || []);
      }
    } catch (error) {
      console.error("Error fetching trending apps:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0D0F1A] pb-24">
      <AppHeader />
      <div className="pt-8 pb-8">
        <div className="max-w-7xl mx-auto px-6" style={{ padding: "24px" }}>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-8"
          >
            <div className="flex items-center gap-3 mb-2">
              <Trophy className="w-8 h-8 text-yellow-500" />
              <h1 className="text-3xl md:text-4xl font-bold text-white">
                Hot Mini Apps
              </h1>
            </div>
            <p className="text-gray-400 text-sm">
              Ranked by reviews, clicks & verified builders
            </p>
          </motion.div>

          {loading ? (
            <div className="space-y-4">
              {[...Array(10)].map((_, i) => (
                <div
                  key={i}
                  className="h-32 bg-gray-900 rounded-xl animate-pulse"
                />
              ))}
            </div>
          ) : trendingApps.length > 0 ? (
            <div className="space-y-4">
              {trendingApps.map((app, index) => (
                <motion.div
                  key={app.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.03 }}
                  className="group relative bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-all duration-300"
                >
                  <div className="flex items-center gap-4">
                    {/* Rank Badge */}
                    <div className="flex-shrink-0">
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 text-white font-bold text-lg shadow-lg border-2 border-[#0B0F19]">
                        {app.rank || index + 1}
                      </div>
                    </div>

                    {/* App Icon */}
                    <div className="flex-shrink-0">
                      {app.iconUrl ? (
                        <div className="w-20 h-20 rounded-xl bg-gray-800 p-2 border border-gray-700">
                          <img
                            src={app.iconUrl}
                            alt={app.name}
                            className="w-full h-full object-contain rounded-lg"
                          />
                        </div>
                      ) : (
                        <div className="w-20 h-20 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center">
                          <span className="text-3xl font-bold text-gray-500">
                            {app.name.charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* App Info */}
                    <div className="flex-1 min-w-0 relative">
                      {/* Favorite Button - Always Top Right */}
                      <div className="absolute top-0 right-0 z-10">
                        <FavoriteButton 
                          appId={app.id} 
                          size="md" 
                          className="flex-shrink-0" 
                        />
                      </div>
                      <div className="pr-10">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-bold text-white mb-1 line-clamp-1">
                              {app.name}
                            </h3>
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              {app.category && (
                                <span className="text-xs text-gray-400">
                                  {app.category}
                                </span>
                              )}
                              {app.tags && app.tags.length > 0 && (
                                <>
                                  {app.tags.slice(0, 3).map((tag: string, i: number) => (
                                    <span key={i} className="text-xs text-gray-400">
                                      • {tag}
                                    </span>
                                  ))}
                                </>
                              )}
                            </div>
                            <p className="text-sm text-gray-400 line-clamp-2 leading-relaxed">
                              {app.description || "No description available"}
                            </p>
                          </div>
                        </div>

                        {/* Rating and Stats Row */}
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <RatingStars 
                                rating={app.ratingAverage || 0} 
                                ratingCount={app.ratingCount || 0} 
                                size={14} 
                                showNumber 
                              />
                            </div>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Star className="w-3 h-3" />
                                <span>{app.ratingCount || 0} reviews</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" />
                                <span>{app.clicks || 0} clicks</span>
                              </div>
                              {app.developer?.verified && (
                                <div className="flex items-center gap-1">
                                  <VerifiedBadge type="developer" iconOnly size="sm" />
                                  <span className="text-green-400">Verified Builder</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <Link
                            href={`/apps/${app.id}`}
                            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition-all duration-300 flex-shrink-0"
                          >
                            Open
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-sm">
                No trending apps available
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

