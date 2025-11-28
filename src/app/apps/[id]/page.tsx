"use client";

import { useState, useEffect } from "react";
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
  const [developerApps, setDeveloperApps] = useState<any[]>([]);

  useEffect(() => {
    if (id) {
      trackPageView(`/apps/${id}`);
    }
  }, [id]);

  useEffect(() => {
    async function fetchApp() {
      try {
        const res = await fetch(`/api/apps/${id}`);
        if (res.ok) {
          const data = await res.json();
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
            
            // Fetch developer's other apps
            if (data.app.developer?.wallet) {
              try {
                const devRes = await fetch(`/api/developers/${encodeURIComponent(data.app.developer.wallet)}`);
                if (devRes.ok) {
                  const devData = await devRes.json();
                  // Filter out the current app from the list
                  const otherApps = (devData.developer?.apps || []).filter(
                    (a: any) => a.id !== id
                  );
                  setDeveloperApps(otherApps.slice(0, 6)); // Show max 6 other apps
                }
              } catch (devError) {
                console.error("Error fetching developer apps:", devError);
                setDeveloperApps([]);
              }
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

  const handleOpenApp = async (type: "base" | "farcaster") => {
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
      // Use baseMiniAppUrl if available, otherwise generate deep link from main URL
      url = app.baseMiniAppUrl || getBaseDeepLink(app.url);
    } else {
      // Use farcasterUrl if available, otherwise generate deep link from main URL
      url = app.farcasterUrl || getFarcasterDeepLink(app.url);
    }
    
    window.location.href = url;
  };

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
          <img
            src={app.headerImageUrl}
            alt={`${app.name} header`}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F19] via-[#0B0F19]/50 to-transparent" />
        </div>
      )}
      <div className="pt-8 pb-8">
        <div className="max-w-screen-md mx-auto px-4">
          {/* App Header - Play Store Style */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-6"
          >
            <div className="flex items-start gap-4 mb-6">
              {/* Large Icon */}
              {app.iconUrl && (
                <Image
                  src={app.iconUrl}
                  alt={app.name}
                  width={120}
                  height={120}
                  className="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-background-secondary p-3 shadow-2xl flex-shrink-0"
                />
              )}

              {/* App Info */}
              <div className="flex-1 min-w-0 relative">
                {/* Favorite Button - Top Right on Mobile, Inline on Desktop */}
                <div className="absolute -top-2 right-0 md:relative md:top-auto md:right-auto md:ml-auto z-10">
                  <FavoriteButton appId={app.id} size="lg" className="md:ml-auto" />
                </div>
                <div className="flex items-center gap-2 mb-2 flex-wrap pr-12 md:pr-0">
                  <h1 className="text-2xl md:text-3xl font-bold">{app.name}</h1>
                  {app.verified && <VerifiedBadge type="app" />}
                </div>
                {app.developer && (
                  <Link
                    href={`/developers/${app.developer.wallet}`}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-base-blue transition-colors mb-3"
                  >
                    <span>{app.developer.name || "Anonymous Developer"}</span>
                    {app.developer.verified && (
                      <VerifiedBadge type="developer" iconOnly size="md" />
                    )}
                    {!app.developer.verified && app.developer.badges && app.developer.badges.length > 0 && (
                      <CheckCircle2 className="w-4 h-4 text-base-blue" />
                    )}
                  </Link>
                )}
                
                <div className="flex items-center gap-4 mb-4">
                  <RatingStars
                    rating={app.ratingAverage || 0}
                    size={16}
                    showNumber
                  />
                  <span className="text-sm text-muted-foreground">
                    {app.ratingCount || 0} reviews
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {app.installs || 0} installs
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className="text-xs">
                    {app.category}
                  </Badge>
                  {app.contractVerified && (
                    <Badge className="text-xs bg-green-600/20 text-green-400 border-green-600/50">
                      <Shield className="w-3 h-3 mr-1" />
                      Contract Verified
                    </Badge>
                  )}
                  {app.topBaseRank && (
                    <Top30Badge rank={app.topBaseRank} className="text-xs" />
                  )}
                  {app.autoUpdated && (
                    <AutoUpdateBadge className="text-xs" />
                  )}
                </div>
              </div>
            </div>

            {/* Owner Actions */}
            {isOwner && (
              <div className="mb-4 flex justify-end">
                <DeleteAppButton
                  appId={id}
                  appName={app.name}
                  onDeleted={() => {
                    router.push("/dashboard");
                  }}
                />
              </div>
            )}

            {/* CTA Buttons */}
            <div className="flex gap-3 mb-6">
              <button
                onClick={() => handleOpenApp("base")}
                className="flex-1 bg-base-blue hover:bg-base-blue/90 text-white px-6 py-3 rounded-full font-medium flex items-center justify-center gap-2 min-h-[48px] transition-colors shadow-lg shadow-base-blue/30"
              >
                <Play className="w-5 h-5" />
                Open in Base
              </button>
              <button
                onClick={() => handleOpenApp("farcaster")}
                className="flex-1 bg-base-cyan/20 hover:bg-base-cyan/30 text-base-cyan border border-base-cyan/50 px-6 py-3 rounded-full font-medium flex items-center justify-center gap-2 min-h-[48px] transition-colors"
              >
                <ExternalLink className="w-5 h-5" />
                Farcaster
              </button>
            </div>
          </motion.div>

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
            className="grid grid-cols-3 gap-4 mb-6"
          >
            <Card className="glass-card text-center p-4">
              <div className="text-2xl font-bold mb-1">
                {((app.ratingAverage || 0) % 1 === 0) 
                  ? (app.ratingAverage || 0).toString() 
                  : (app.ratingAverage || 0).toFixed(1)}
              </div>
              <div className="text-xs text-muted-foreground">Rating</div>
            </Card>
            <Card className="glass-card text-center p-4">
              <div className="text-2xl font-bold mb-1">
                {app.installs || 0}
              </div>
              <div className="text-xs text-muted-foreground">Installs</div>
            </Card>
            <Card className="glass-card text-center p-4">
              <div className="text-2xl font-bold mb-1">
                {app.clicks || 0}
              </div>
              <div className="text-xs text-muted-foreground">Clicks</div>
            </Card>
          </motion.div>

          {/* Developer's Other Apps */}
          {app.developer && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="mb-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">
                  More from {app.developer.name || "Developer"}
                </h2>
                <Link
                  href={`/developers/${app.developer.wallet}`}
                  className="text-base-blue text-sm font-medium"
                >
                  View All →
                </Link>
              </div>
              {developerApps.length > 0 ? (
                <AppGrid
                  apps={developerApps}
                  variant="horizontal"
                />
              ) : (
                <Card className="glass-card p-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    No other apps from this developer yet.
                  </p>
                </Card>
              )}
            </motion.div>
          )}

          {/* Reviews Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
            className="mb-6"
          >
            <h2 className="text-lg font-semibold mb-4">
              Ratings & Reviews ({app.ratingCount || 0})
            </h2>
            
            {!isOwner && (
              <div className="mb-6">
                <ReviewForm
                  appId={id}
                  onReviewSubmitted={async () => {
                    // Refresh app data to show updated rating and review count
                    const res = await fetch(`/api/apps/${id}`);
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
