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
      <div className="pt-4 md:pt-8 pb-8">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-4 md:mb-8"
          >
            <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
              <Trophy className="w-6 h-6 md:w-8 md:h-8 text-yellow-500" />
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white">
                Hot Mini Apps
              </h1>
            </div>
            <p className="text-gray-400 text-xs md:text-sm">
              Ranked by reviews, clicks & verified builders
            </p>
          </motion.div>

          {loading ? (
            <div className="space-y-3 md:space-y-4">
              {[...Array(10)].map((_, i) => (
                <div
                  key={i}
                  className="h-24 md:h-32 bg-gray-900 rounded-xl animate-pulse"
                />
              ))}
            </div>
          ) : trendingApps.length > 0 ? (
            <div className="space-y-3 md:space-y-4">
              {trendingApps.map((app, index) => (
                <motion.div
                  key={app.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.03 }}
                  className="group relative bg-gray-900 border border-gray-800 rounded-xl p-3 md:p-5 hover:border-gray-700 transition-all duration-300"
                >
                  <div className="flex items-center gap-2 md:gap-4">
                    {/* Rank Badge - Smaller on mobile */}
                    <div className="flex-shrink-0">
                      <div className="flex items-center justify-center w-8 h-8 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 text-white font-bold text-sm md:text-lg shadow-lg border-2 border-[#0B0F19]">
                        {app.rank || index + 1}
                      </div>
                    </div>

                    {/* App Icon - Smaller on mobile */}
                    <div className="flex-shrink-0">
                      {app.iconUrl ? (
                        <div className="w-14 h-14 md:w-20 md:h-20 rounded-lg md:rounded-xl bg-gray-800 p-1.5 md:p-2 border border-gray-700">
                          <Image
                            src={app.iconUrl}
                            alt={app.name}
                            width={80}
                            height={80}
                            className="w-full h-full object-contain rounded"
                            unoptimized
                          />
                        </div>
                      ) : (
                        <div className="w-14 h-14 md:w-20 md:h-20 rounded-lg md:rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center">
                          <span className="text-xl md:text-3xl font-bold text-gray-500">
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
                          size="sm" 
                          className="flex-shrink-0" 
                        />
                      </div>
                      <div className="pr-8 md:pr-10">
                        <div className="flex items-start justify-between gap-2 md:gap-3 mb-1 md:mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm md:text-lg font-bold text-white mb-0.5 md:mb-1 line-clamp-1">
                              {app.name}
                            </h3>
                            <div className="flex items-center gap-1 md:gap-2 flex-wrap mb-1">
                              {app.category && (
                                <span className="text-[10px] md:text-xs text-gray-400">
                                  {app.category}
                                </span>
                              )}
                              {app.tags && app.tags.length > 0 && (
                                <>
                                  {app.tags.slice(0, 2).map((tag: string, i: number) => (
                                    <span key={i} className="text-[10px] md:text-xs text-gray-400">
                                      • {tag}
                                    </span>
                                  ))}
                                </>
                              )}
                            </div>
                            <p className="text-xs md:text-sm text-gray-400 line-clamp-1 md:line-clamp-2 leading-relaxed">
                              {app.description || "No description available"}
                            </p>
                          </div>
                        </div>

                        {/* Rating and Stats Row - Compact on mobile */}
                        <div className="flex items-center justify-between mt-2 md:mt-3 gap-2">
                          <div className="flex items-center gap-2 md:gap-4 flex-wrap">
                            <div className="flex items-center gap-1 md:gap-2">
                              <RatingStars 
                                rating={app.ratingAverage || 0} 
                                ratingCount={app.ratingCount || 0} 
                                size={12} 
                                showNumber 
                              />
                            </div>
                            <div className="hidden sm:flex items-center gap-3 md:gap-4 text-xs text-muted-foreground">
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
                                  <span className="text-green-400">Verified</span>
                                </div>
                              )}
                            </div>
                            {/* Mobile: Show only verified badge if present */}
                            {app.developer?.verified && (
                              <div className="sm:hidden">
                                <VerifiedBadge type="developer" iconOnly size="sm" />
                              </div>
                            )}
                          </div>

                          <Link
                            href={`/apps/${app.id}`}
                            className="px-3 md:px-6 py-1.5 md:py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs md:text-sm font-semibold transition-all duration-300 flex-shrink-0"
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

