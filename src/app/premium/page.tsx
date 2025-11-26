"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import PremiumSubscriptionBanner from "@/components/PremiumSubscriptionBanner";
import PremiumAppCarousel from "@/components/PremiumAppCarousel";
import AppCard from "@/components/AppCard";
import HorizontalScroller from "@/components/HorizontalScroller";
import PageLoader from "@/components/PageLoader";
import { Crown, Sparkles, TrendingUp, Zap } from "lucide-react";
import { trackPageView } from "@/lib/analytics";

export default function PremiumPage() {
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [premiumApps, setPremiumApps] = useState<any[]>([]);
  const [gamesPlaying, setGamesPlaying] = useState<any[]>([]);
  const [getStarted, setGetStarted] = useState<any[]>([]);
  const [onSale, setOnSale] = useState<any[]>([]);

  const [premiumFeatureEnabled, setPremiumFeatureEnabled] = useState(true);

  useEffect(() => {
    trackPageView("/premium");
  }, []);

  useEffect(() => {
    async function fetchData() {
      try {
        // Check if premium features are enabled
        const settingsRes = await fetch("/api/settings/premium");
        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          setPremiumFeatureEnabled(settingsData.premiumEnabled ?? true);
        }

        // If premium is disabled, don't fetch premium data
        if (!premiumFeatureEnabled) {
          setLoading(false);
          return;
        }

        // Check premium status
        const statusRes = await fetch("/api/premium/status", {
          credentials: "include",
        });
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          setIsPremium(statusData.isPremium);
        }

        // Fetch premium apps
        const appsRes = await fetch("/api/premium/apps", {
          credentials: "include",
        });
        if (appsRes.ok) {
          const appsData = await appsRes.json();
          setPremiumApps(appsData.premiumApps || []);
          setGamesPlaying(appsData.gamesPlaying || []);
          setGetStarted(appsData.getStarted || []);
          setOnSale(appsData.onSale || []);
        }
      } catch (error) {
        console.error("Error fetching premium data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const handleSubscribe = () => {
    // Scroll to top to show subscription banner
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (loading) {
    return <PageLoader message="Loading Premium..." />;
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] pb-24">
      {/* Header */}
      <section className="pt-20 pb-6 px-4">
        <div className="max-w-screen-md mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-6"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-card mb-4">
              <Crown className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-muted-foreground">
                Mini App Store Premium
              </span>
            </div>
            
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              <span className="bg-gradient-to-r from-purple-400 to-base-blue bg-clip-text text-transparent">
                Premium Experience
              </span>
            </h1>
            
            <p className="text-sm text-muted-foreground mb-6">
              Exclusive apps, analytics, and perks for premium members
            </p>
          </motion.div>
        </div>
      </section>

      {/* Subscription Banner */}
      <section className="px-4">
        <div className="max-w-screen-md mx-auto">
          <PremiumSubscriptionBanner />
        </div>
      </section>

      {/* Games We're Playing */}
      {gamesPlaying.length > 0 && (
        <PremiumAppCarousel
          title="Games We're Playing"
          apps={gamesPlaying}
          isLocked={!isPremium}
          onSubscribe={handleSubscribe}
        />
      )}

      {/* Get Started */}
      {getStarted.length > 0 && (
        <section className="py-6">
          <div className="max-w-screen-md mx-auto px-4 mb-4">
            <h2 className="text-lg font-semibold mb-1">Get Started</h2>
            <p className="text-xs text-muted-foreground">
              Explore some popular premium titles
            </p>
          </div>
          <HorizontalScroller>
            {getStarted.map((app: any) => (
              <div key={app.id} className="min-w-[340px] max-w-[380px] relative">
                {!isPremium && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-2xl z-10 flex items-center justify-center">
                    <div className="text-center p-4">
                      <Crown className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                      <p className="text-sm text-white mb-3">Premium Content</p>
                      <button
                        onClick={handleSubscribe}
                        className="bg-gradient-to-r from-purple-600 to-base-blue text-white px-4 py-2 rounded-full text-sm font-medium"
                      >
                        Unlock Premium
                      </button>
                    </div>
                  </div>
                )}
                <AppCard
                  id={app.id}
                  name={app.name}
                  description={app.description}
                  iconUrl={app.iconUrl}
                  category={app.category}
                  ratingAverage={app.ratingAverage || 0}
                  ratingCount={app.ratingCount || 0}
                  installs={app.installs || 0}
                  developer={app.developer}
                  verified={app.verified || false}
                  variant="featured"
                />
              </div>
            ))}
          </HorizontalScroller>
        </section>
      )}

      {/* Premium Apps */}
      {premiumApps.length > 0 && (
        <section className="py-6">
          <div className="max-w-screen-md mx-auto px-4 mb-4">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <h2 className="text-lg font-semibold">Premium Apps</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Curated selection of premium mini apps
            </p>
          </div>
          <HorizontalScroller>
            {premiumApps.map((app: any) => (
              <div key={app.id} className="min-w-[280px] relative">
                {!isPremium && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-xl z-10 flex items-center justify-center">
                    <div className="text-center p-4">
                      <Crown className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                      <p className="text-xs text-white mb-2">Premium</p>
                    </div>
                  </div>
                )}
                <AppCard
                  id={app.id}
                  name={app.name}
                  description={app.description}
                  iconUrl={app.iconUrl}
                  category={app.category}
                  ratingAverage={app.ratingAverage || 0}
                  ratingCount={app.ratingCount || 0}
                  installs={app.installs || 0}
                  developer={app.developer}
                  verified={app.verified || false}
                  variant="horizontal"
                />
              </div>
            ))}
          </HorizontalScroller>
        </section>
      )}

      {/* Games / Apps on Sale */}
      {onSale.length > 0 && (
        <section className="py-6">
          <div className="max-w-screen-md mx-auto px-4 mb-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-5 h-5 text-orange-400" />
              <h2 className="text-lg font-semibold">Games on Sale</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Play these latest deals
            </p>
          </div>
          <HorizontalScroller>
            {onSale.map((app: any) => (
              <div key={app.id} className="min-w-[280px] relative">
                {!isPremium && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-xl z-10 flex items-center justify-center">
                    <div className="text-center p-4">
                      <Crown className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                      <p className="text-xs text-white mb-2">Premium</p>
                    </div>
                  </div>
                )}
                <AppCard
                  id={app.id}
                  name={app.name}
                  description={app.description}
                  iconUrl={app.iconUrl}
                  category={app.category}
                  ratingAverage={app.ratingAverage || 0}
                  ratingCount={app.ratingCount || 0}
                  installs={app.installs || 0}
                  developer={app.developer}
                  verified={app.verified || false}
                  variant="horizontal"
                />
              </div>
            ))}
          </HorizontalScroller>
        </section>
      )}

      {/* Premium Perks Section */}
      {isPremium && (
        <section className="py-6 px-4">
          <div className="max-w-screen-md mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-6 rounded-2xl"
            >
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-purple-400" />
                Your Premium Perks
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <div className="bg-purple-600/20 p-2 rounded-lg">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">+10% XP Multiplier</h3>
                    <p className="text-xs text-muted-foreground">
                      Earn more XP on every app launch
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-purple-600/20 p-2 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Premium Analytics</h3>
                    <p className="text-xs text-muted-foreground">
                      Advanced insights for your apps
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-purple-600/20 p-2 rounded-lg">
                    <Zap className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Monthly Boost</h3>
                    <p className="text-xs text-muted-foreground">
                      1 boost credit per month
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-purple-600/20 p-2 rounded-lg">
                    <Crown className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Early Access</h3>
                    <p className="text-xs text-muted-foreground">
                      Get new apps before everyone else
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      )}
    </div>
  );
}

