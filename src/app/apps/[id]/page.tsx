"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import GlowButton from "@/components/GlowButton";
import ReviewCard from "@/components/ReviewCard";
import ReviewForm from "@/components/ReviewForm";
import AppGrid from "@/components/AppGrid";
import PageLoader from "@/components/PageLoader";
import DeleteAppButton from "@/components/DeleteAppButton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Star, Users, ExternalLink, Play, CheckCircle2, Zap, Clock, Shield } from "lucide-react";
import { motion } from "framer-motion";
import { getBaseDeepLink, getFarcasterDeepLink } from "@/lib/baseDeepLink";
import RatingStars from "@/components/RatingStars";
import VerifiedBadge from "@/components/VerifiedBadge";
import UnverifiedBadge from "@/components/UnverifiedBadge";
import Top30Badge from "@/components/Top30Badge";
import AutoUpdateBadge from "@/components/AutoUpdateBadge";
import FavoriteButton from "@/components/FavoriteButton";
import AppHeader from "@/components/AppHeader";
import { trackPageView, trackAppInteraction } from "@/lib/analytics";
import { useToast } from "@/hooks/use-toast";

export default function AppDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const id = params.id as string;
  const [app, setApp] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [recommendedApps, setRecommendedApps] = useState<any[]>([]);

  useEffect(() => {
    if (id) {
      trackPageView(`/apps/${id}`);
    }
  }, [id]);

  useEffect(() => {
    async function fetchApp() {
      try {
        const res = await fetch(`/api/apps/${id}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
          },
        });
        if (res.ok) {
          const data = await res.json();
          console.log('[AppDetail] Fetched data:', {
            ratingCount: data.app?.ratingCount,
            reviewsLength: data.reviews?.length,
            ratingAverage: data.app?.ratingAverage,
          });
          setApp(data.app);
          setReviews(data.reviews || []);
          if (data.app) {
            trackAppInteraction(id, "view");
            
            // Check if current user is the owner
            try {
              const authRes = await fetch("/api/auth/wallet", {
                method: "GET",
                credentials: "include",
              });
              if (authRes.ok) {
                const authData = await authRes.json();
                if (authData.wallet && data.app.developer?.wallet) {
                  setIsOwner(
                    authData.wallet.toLowerCase() ===
                      data.app.developer.wallet.toLowerCase()
                  );
                }
              }
            } catch (authError) {
              // Not authenticated, not owner
              setIsOwner(false);
            }
            
            // Fetch recommended apps based on tags and category
            try {
              const tags = data.app.tags || [];
              const category = data.app.category;
              
              // Build query params for recommendations
              const params = new URLSearchParams();
              params.set("limit", "12"); // Get more to ensure we have enough after filtering
              params.set("sort", "trending");
              
              // If app has tags, search by tags first
              if (tags.length > 0) {
                // Use the first tag for recommendations
                params.set("tag", tags[0].toLowerCase());
              } else if (category) {
                // Fallback to category if no tags
                params.set("category", category);
              }
              
              const recRes = await fetch(`/api/apps?${params.toString()}`);
              if (recRes.ok) {
                const recData = await recRes.json();
                // Filter out the current app and get up to 6 recommended apps
                const filtered = (recData.apps || []).filter(
                  (a: any) => a.id !== id
                );
                setRecommendedApps(filtered.slice(0, 6));
              }
            } catch (recError) {
              console.error("Error fetching recommended apps:", recError);
              setRecommendedApps([]);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching app:", error);
      } finally {
        setLoading(false);
      }
    }

    if (id) fetchApp();
  }, [id]);

  const handleOpenApp = useCallback(async (type: "base" | "farcaster") => {
    if (!app) return;

    // Award launch XP
    let xpEarned = 0;
    try {
      const launchRes = await fetch("/api/xp/launch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ appId: id }),
      });
      
        if (launchRes.ok) {
          const launchData = await launchRes.json();
          xpEarned = launchData.xpEarned || 0;
          if (xpEarned > 0 && launchData.message) {
            // Show XP toast
            toast({
              title: "XP Earned!",
              description: launchData.message,
            });
          }
        } else if (launchRes.status === 429) {
          const launchData = await launchRes.json();
          toast({
            title: "Cooldown Active",
            description: launchData.message || "You can earn XP again in 5 minutes",
            variant: "default",
          });
        }
    } catch (error) {
      console.error("Error awarding launch XP:", error);
    }

    // Log event
    try {
      await fetch(`/api/apps/${id}/click`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ type: "open" }),
      });
      trackAppInteraction(id, type === "base" ? "open" : "open");
    } catch (error) {
      console.error("Error logging event:", error);
    }

    // Open app - use specific URL if available, otherwise generate deep link
    let url: string;
    if (type === "base") {
      // For Base, use the original app URL (not webhook URL)
      // Only use baseMiniAppUrl if it exists and is NOT a webhook URL
      const isWebhookUrl = app.baseMiniAppUrl?.includes('/fc-webhook') || 
                          app.baseMiniAppUrl?.includes('/webhook') ||
                          app.baseMiniAppUrl?.includes('/frame');
      if (app.baseMiniAppUrl && !isWebhookUrl) {
        url = app.baseMiniAppUrl;
      } else {
        // Use original URL or generate deep link from main URL
        url = app.url || getBaseDeepLink(app.url);
      }
    } else {
      // Use farcasterUrl if available, otherwise generate deep link from main URL
      url = app.farcasterUrl || getFarcasterDeepLink(app.url);
    }
    
    window.location.href = url;
  }, [app, id, toast]);

  if (loading) {
    return <PageLoader message="Loading app..." />;
  }

  if (!app) {
    return (
      <div className="min-h-screen bg-[#0B0F19] pt-8 px-4 pb-24">
        <AppHeader />
        <div className="max-w-screen-md mx-auto text-center py-20">
          <h1 className="text-2xl font-bold mb-4">App Not Found</h1>
          <Link href="/apps" className="text-base-blue hover:underline">
            Back to Apps
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] pb-24">
      <AppHeader />
      {/* Header Image (like Twitter header) */}
      {app.headerImageUrl && (
        <div className="w-full h-48 md:h-64 lg:h-80 relative overflow-hidden">
          <Image
            src={app.headerImageUrl}
            alt={`${app.name} header`}
            width={1920}
            height={800}
            className="w-full h-full object-cover"
            priority
            quality={90}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F19] via-[#0B0F19]/50 to-transparent" />
        </div>
      )}
      <div className="pt-8 pb-8">
        <div className="max-w-screen-md mx-auto px-4">
          {/* App Header - Card Style */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-4 relative"
          >
            <Card className="bg-gray-900/50 border border-gray-800/50 overflow-hidden relative">
              {/* Favorite Button - Top Right */}
              <div className="absolute top-1.5 right-1.5 md:top-2 md:right-2 z-20">
                <FavoriteButton appId={app.id} size="sm" />
              </div>
              <CardContent className="p-3 md:p-5">

                <div className="flex items-start gap-2 md:gap-3 pr-8 md:pr-10">
                  {/* App Icon - Smaller on mobile */}
                  {app.iconUrl && (
                    <Image
                      src={app.iconUrl}
                      alt={app.name}
                      width={64}
                      height={64}
                      className="w-12 h-12 md:w-16 md:h-16 rounded-lg md:rounded-xl bg-background-secondary p-1 md:p-1.5 shadow-lg flex-shrink-0"
                    />
                  )}

                  {/* App Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 md:gap-2 mb-0.5 md:mb-1 flex-wrap">
                      <h1 className="text-base md:text-lg lg:text-xl font-bold">{app.name}</h1>
                      {app.verified ? (
                        <VerifiedBadge type="app" />
                      ) : (
                        <UnverifiedBadge />
                      )}
                    </div>
                    {app.developer && (
                      <Link
                        href={`/developers/${app.developer.wallet}`}
                        className="flex items-center gap-1 text-[10px] md:text-xs text-muted-foreground hover:text-base-blue transition-colors mb-1 md:mb-2"
                      >
                        <span>{app.developer.name || "Anonymous Developer"}</span>
                        {app.developer.verified && (
                          <VerifiedBadge type="developer" iconOnly size="sm" />
                        )}
                        {!app.developer.verified && app.developer.badges && app.developer.badges.length > 0 && (
                          <CheckCircle2 className="w-2.5 h-2.5 md:w-3 md:h-3 text-base-blue" />
                        )}
                      </Link>
                    )}
                    
                    <div className="flex items-center gap-1.5 md:gap-2 mb-1.5 md:mb-2">
                      <RatingStars
                        rating={app.ratingAverage || 0}
                        ratingCount={reviews.length}
                        size={11}
                        showNumber
                      />
                      <span className="text-[10px] md:text-xs text-muted-foreground">
                        ({reviews.length})
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 md:gap-2 flex-wrap mb-2 md:mb-3">
                      <Badge variant="secondary" className="text-[10px] md:text-xs px-1.5 md:px-2 py-0.5">
                        {app.category}
                      </Badge>
                      {app.contractVerified && (
                        <Badge className="text-[10px] md:text-xs bg-green-600/20 text-green-400 border-green-600/50 px-1.5 md:px-2 py-0.5">
                          <Shield className="w-2.5 h-2.5 md:w-3 md:h-3 mr-0.5 md:mr-1" />
                          Contract Verified
                        </Badge>
                      )}
                      {app.topBaseRank && (
                        <Top30Badge rank={app.topBaseRank} className="text-[10px] md:text-xs" />
                      )}
                      {app.autoUpdated && (
                        <AutoUpdateBadge className="text-[10px] md:text-xs" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Owner Actions */}
                {isOwner && (
                  <div className="mb-2 md:mb-3 flex justify-end">
                    <DeleteAppButton
                      appId={id}
                      appName={app.name}
                      onDeleted={() => {
                        router.push("/dashboard");
                      }}
                    />
                  </div>
                )}

                {/* Open App Button - Bottom Right */}
                <div className="flex justify-end mt-2 md:mt-3">
                  <button
                    onClick={() => handleOpenApp("base")}
                    className="bg-base-blue hover:bg-base-blue/90 text-white px-4 md:px-5 py-1.5 md:py-2 rounded-full font-medium flex items-center justify-center gap-1.5 md:gap-2 min-h-[36px] md:min-h-[40px] transition-colors shadow-lg shadow-base-blue/30 text-xs md:text-sm"
                  >
                    <Play className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    Open App
                  </button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Screenshots Section */}
          {app.screenshots && app.screenshots.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.08 }}
              className="mb-6"
            >
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
                {app.screenshots.map((screenshot: string, index: number) => (
                  <div
                    key={index}
                    className="flex-shrink-0 relative group cursor-pointer snap-center"
                    onClick={() => {
                      // Open screenshot in lightbox or new tab
                      window.open(screenshot, '_blank');
                    }}
                  >
                    <div className="relative w-48 h-80 md:w-64 md:h-96 rounded-2xl overflow-hidden border-2 border-white/20 bg-black/40 backdrop-blur-sm shadow-xl group-hover:border-white/40 transition-all group-hover:shadow-2xl">
                      <Image
                        src={screenshot}
                        alt={`${app.name} screenshot ${index + 1}`}
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                        sizes="(max-width: 768px) 192px, 256px"
                        unoptimized
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* About Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="glass-card p-6 mb-6 rounded-2xl"
          >
            <h2 className="text-lg font-semibold mb-3">About this Mini App</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {app.description}
            </p>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="mb-6"
          >
            <Card className="glass-card text-center p-4">
              <div className="text-2xl font-bold mb-1">
                {reviews.length > 0 ? (
                  (app.ratingAverage || 0) % 1 === 0 
                    ? (app.ratingAverage || 0).toString() 
                    : (app.ratingAverage || 0).toFixed(1)
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {reviews.length > 0 ? 'Rating' : 'Not rated'}
              </div>
            </Card>
          </motion.div>

          {/* Recommended Mini Apps */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="mb-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                Recommended Mini Apps
              </h2>
              {app.tags && app.tags.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  Similar to: {app.tags.slice(0, 2).join(", ")}
                </span>
              )}
              {!app.tags && app.category && (
                <span className="text-xs text-muted-foreground">
                  Similar to: {app.category}
                </span>
              )}
            </div>
            {recommendedApps.length > 0 ? (
              <AppGrid
                apps={recommendedApps}
                variant="horizontal"
              />
            ) : (
              <Card className="glass-card p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  No recommended apps found.
                </p>
              </Card>
            )}
          </motion.div>

          {/* Reviews Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
            className="mb-6"
          >
            <h2 className="text-lg font-semibold mb-4">
              Ratings & Reviews ({reviews.length})
            </h2>
            
            {!isOwner && (
              <div className="mb-6">
                <ReviewForm
                  appId={id}
                  onReviewSubmitted={async () => {
                    // Refresh app data to show updated rating and review count
                    const res = await fetch(`/api/apps/${id}`, {
                      cache: 'no-store',
                      headers: {
                        'Cache-Control': 'no-cache',
                      },
                    });
                    if (res.ok) {
                      const data = await res.json();
                      setApp(data.app);
                      setReviews(data.reviews || []);
                    }
                  }}
                />
              </div>
            )}
            {isOwner && (
              <Card className="glass-card p-4 mb-6">
                <p className="text-sm text-muted-foreground text-center">
                  You cannot rate your own app.
                </p>
              </Card>
            )}

            <div className="space-y-4">
              {reviews.length > 0 ? (
                reviews.map((review) => {
                  const reviewDate = review.createdAt 
                    ? (typeof review.createdAt === 'string' 
                        ? new Date(review.createdAt).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                          })
                        : review.createdAt.toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                          }))
                    : 'Unknown date';
                  
                  return (
                    <ReviewCard
                      key={review.id}
                      userName={review.developerReviewer?.name || "Anonymous"}
                      userAvatar={review.developerReviewer?.avatar || "https://via.placeholder.com/48"}
                      rating={review.rating}
                      comment={review.comment || ""}
                      date={reviewDate}
                      helpful={0}
                    />
                  );
                })
              ) : (
                <Card className="glass-card p-6 text-center">
                  <p className="text-muted-foreground text-sm">
                    No reviews yet. Be the first to review!
                  </p>
                </Card>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
