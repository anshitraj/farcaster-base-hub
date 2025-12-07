"use client";

import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import AppHeader from "@/components/AppHeader";
import { motion } from "framer-motion";
import { ChevronRight, Zap, Puzzle, Gift, TrendingUp, Coins, DollarSign, Wrench, Flame, Sparkles, Crown, MessageSquare, TrendingDown, Briefcase, AlertTriangle, X } from "lucide-react";
import { trackPageView } from "@/lib/analytics";
import NotificationSidebar from "@/components/NotificationSidebar";
import HorizontalAppCard from "@/components/HorizontalAppCard";
import { CategoryHighlightCard } from "@/components/CategoryHighlightCard";
import CategoryCard from "@/components/CategoryCard";
import PromoSection from "@/components/PromoSection";

// Lazy load heavy components (only load when needed)
const TopBanner = lazy(() => import("@/components/TopBanner"));
import { useMiniApp } from "@/components/MiniAppProvider";
import { useToast } from "@/hooks/use-toast";
import { optimizeDevImage, optimizeBannerImage } from "@/utils/optimizeDevImage";

// Lazy load heavy components
const ComingSoonPremiumSection = lazy(() => import("@/components/ComingSoonPremiumSection"));

// All app categories with icons (including game genres)
const appCategories = [
  // Trending at first position
  { name: "Trending", icon: Flame, color: "from-orange-500 to-red-600", href: "/apps/trending" },
  // Game genres
  { name: "Action", icon: Zap, color: "from-red-500 to-red-600", href: "/apps?category=Games&tag=action" },
  { name: "Puzzle", icon: Puzzle, color: "from-blue-500 to-blue-600", href: "/apps?category=Games&tag=puzzle" },
  // App categories
  { name: "New Apps", icon: Sparkles, color: "from-blue-500 to-cyan-600", href: "/apps?sort=newest" },
  { name: "Premium Apps", icon: Crown, color: "from-yellow-500 to-amber-600", href: "/apps?premium=true" },
  { name: "Communication", icon: MessageSquare, color: "from-green-500 to-green-600", href: "/apps?category=Social&tag=communication" },
  { name: "Airdrop", icon: Gift, color: "from-cyan-500 to-cyan-600", href: "/apps?category=Airdrops" },
  { name: "Prediction", icon: TrendingUp, color: "from-orange-500 to-orange-600", href: "/apps?category=Finance&tag=prediction" },
  { name: "Crowdfunding", icon: Coins, color: "from-amber-500 to-amber-600", href: "/apps?category=Finance&tag=crowdfunding" },
  { name: "Memecoins", icon: DollarSign, color: "from-purple-500 to-pink-600", href: "/apps?category=Memecoins" },
  { name: "Productivity", icon: Briefcase, color: "from-blue-500 to-indigo-600", href: "/apps?category=Productivity" },
  { name: "Tools", icon: Wrench, color: "from-cyan-500 to-blue-600", href: "/apps?category=Tools" },
];

function HomePageContent() {
  const [topApps, setTopApps] = useState<any[]>([]);
  const [trendingApps, setTrendingApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarHidden, setSidebarHidden] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationSidebarOpen, setNotificationSidebarOpen] = useState(false);
  const [farcasterError, setFarcasterError] = useState<string | null>(null);
  const miniAppContext = useMiniApp();
  const { isInMiniApp, loaded: miniAppLoaded } = miniAppContext;
  const searchParams = useSearchParams();

  // On desktop, sidebar should always be visible (isOpen = true)
  // On mobile, it starts closed
  // Only set initial state once, don't reset on every render
  useEffect(() => {
    const checkMobile = () => {
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
    };
    
    // Set initial state immediately
    if (typeof window !== 'undefined') {
      checkMobile();
    }
    
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        // Always show on desktop
        setSidebarOpen(true);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []); // Only run once on mount

  // Save sidebar state to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebarOpen', String(sidebarOpen));
    }
  }, [sidebarOpen]);

  const handleSidebarChange = (collapsed: boolean, hidden: boolean) => {
    setSidebarCollapsed(collapsed);
    setSidebarHidden(hidden);
  };

  useEffect(() => {
    trackPageView("/");
  }, []);

  // Handle referral links from homepage
  useEffect(() => {
    const refFid = searchParams?.get("ref");
    if (refFid) {
      // Redirect to quests page with referral parameter
      if (typeof window !== "undefined") {
        window.location.href = `/quests?ref=${refFid}`;
      }
    }
  }, [searchParams]);

  // Check for Farcaster login errors in URL
  useEffect(() => {
    const error = searchParams?.get("error");
    if (error) {
      let errorMessage = "";
      const hint = searchParams?.get("hint");
      
      if (error.includes("token_exchange")) {
        errorMessage = "Farcaster login failed during token exchange.";
        if (hint) {
          errorMessage += ` ${hint}`;
        }
      } else if (error === "config") {
        errorMessage = "Farcaster OAuth not configured. Check NEYNAR_CLIENT_ID and NEYNAR_CLIENT_SECRET.";
      } else if (error === "no_code") {
        errorMessage = "Farcaster login cancelled or no authorization code received.";
      } else if (error === "no_token") {
        errorMessage = "Failed to get access token from Farcaster.";
      } else if (error === "user_fetch") {
        errorMessage = "Failed to fetch user info from Farcaster.";
      } else if (error === "no_user") {
        errorMessage = "No user data received from Farcaster.";
      } else if (error === "callback_error") {
        errorMessage = "Error during Farcaster login callback.";
      }
      
      if (errorMessage) {
        setFarcasterError(errorMessage);
        // Clear error from URL after 10 seconds
        setTimeout(() => {
          setFarcasterError(null);
          if (typeof window !== "undefined") {
            const url = new URL(window.location.href);
            url.searchParams.delete("error");
            url.searchParams.delete("hint");
            window.history.replaceState({}, "", url.toString());
          }
        }, 10000);
      }
    }
  }, [searchParams]);

  // Check for Farcaster login errors in URL
  useEffect(() => {
    const error = searchParams?.get("error");
    if (error) {
      let errorMessage = "";
      const hint = searchParams?.get("hint");
      
      if (error.includes("token_exchange")) {
        errorMessage = "Farcaster login failed during token exchange.";
        if (hint) {
          errorMessage += ` ${hint}`;
        }
      } else if (error === "config") {
        errorMessage = "Farcaster OAuth not configured. Check NEYNAR_CLIENT_ID and NEYNAR_CLIENT_SECRET.";
      } else if (error === "no_code") {
        errorMessage = "Farcaster login cancelled or no authorization code received.";
      } else if (error === "no_token") {
        errorMessage = "Failed to get access token from Farcaster.";
      } else if (error === "user_fetch") {
        errorMessage = "Failed to fetch user info from Farcaster.";
      } else if (error === "no_user") {
        errorMessage = "No user data received from Farcaster.";
      } else if (error === "callback_error") {
        errorMessage = "Error during Farcaster login callback.";
      }
      
      if (errorMessage) {
        setFarcasterError(errorMessage);
        // Clear error from URL after 10 seconds
        setTimeout(() => {
          setFarcasterError(null);
          if (typeof window !== "undefined") {
            const url = new URL(window.location.href);
            url.searchParams.delete("error");
            url.searchParams.delete("hint");
            window.history.replaceState({}, "", url.toString());
          }
        }, 10000);
      }
    }
  }, [searchParams]);

  // Lightweight preload - only first banner image and icon (LCP optimization)
  useEffect(() => {
    if (typeof window === "undefined" || topApps.length === 0) return;
    
    // Preload the first banner image for LCP
    const firstApp = topApps[0];
    if (firstApp?.headerImageUrl) {
      const optimizedBannerUrl = optimizeBannerImage(firstApp.headerImageUrl);
      const bannerLink = document.createElement("link");
      bannerLink.rel = "preload";
      bannerLink.as = "image";
      bannerLink.href = optimizedBannerUrl;
      bannerLink.setAttribute("fetchpriority", "high");
      document.head.appendChild(bannerLink);
    }
    
    // Preload the first app icon for LCP
    if (firstApp?.iconUrl) {
      const optimizedIconUrl = optimizeDevImage(firstApp.iconUrl);
      const iconLink = document.createElement("link");
      iconLink.rel = "preload";
      iconLink.as = "image";
      iconLink.href = optimizedIconUrl;
      iconLink.setAttribute("fetchpriority", "high");
      document.head.appendChild(iconLink);
    }
    
    // Preload logo
    const logoLink = document.createElement("link");
    logoLink.rel = "preload";
    logoLink.as = "image";
    logoLink.href = "/logo.webp";
    logoLink.setAttribute("fetchpriority", "high");
    document.head.appendChild(logoLink);
  }, [topApps]);

  useEffect(() => {
    // Don't wait for Mini App - fetch data immediately
    // API calls will work with or without Mini App context
    async function fetchData() {
      try {
        const fetchWithErrorHandling = async (url: string, fallback: any = [], options: RequestInit = {}) => {
          try {
            const res = await fetch(url, { 
              credentials: "include",
              ...options,
              headers: {
                ...options.headers,
                'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120'
              }
            });
            if (res.ok) {
              return await res.json();
            }
            return { apps: fallback };
          } catch (error) {
            console.error(`Error fetching ${url}:`, error);
            return { apps: fallback };
          }
        };

        // Fetch trending apps - top 10 for banner carousel and trending section
        // Use cache to reduce TTFB - cache for 60 seconds
        const trendingData = await fetchWithErrorHandling("/api/apps/trending?limit=10", [], {
          next: { revalidate: 60 }
        });
        let allTrendingApps = trendingData.apps || [];
        
        // If no trending apps, fetch recent approved apps as fallback
        if (allTrendingApps.length === 0) {
          const recentData = await fetchWithErrorHandling("/api/apps?limit=10&sort=newest", [], {
            next: { revalidate: 60 }
          });
          allTrendingApps = recentData.apps || [];
        }
        
        if (allTrendingApps.length > 0) {
          console.log(`Setting ${allTrendingApps.length} apps to display`);
          // Top 10 apps for the banner carousel (or all if less than 10)
          setTopApps(allTrendingApps.slice(0, 10));
          // Top 10 apps for trending section
          setTrendingApps(allTrendingApps.slice(0, 10));
        } else {
          console.warn("No apps found to display on homepage!");
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    }

    // Don't wait for MiniApp - fetch data immediately
    fetchData();
  }, []); // Remove dependency on miniAppLoaded to fetch immediately

  return (
    <div className="flex min-h-screen bg-black">
      {/* Farcaster Error Banner */}
      {farcasterError && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3"
          >
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-400 mb-1">Farcaster Login Error</p>
              <p className="text-xs text-red-300/80">{farcasterError}</p>
              <Link 
                href="/api/auth/farcaster/check" 
                target="_blank"
                className="text-xs text-red-400 hover:text-red-300 underline mt-2 inline-block"
              >
                Check Configuration →
              </Link>
            </div>
            <button
              onClick={() => setFarcasterError(null)}
              className="text-red-400 hover:text-red-300"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        </div>
      )}
      {/* Sidebar */}
      <Sidebar 
        onCollapseChange={handleSidebarChange}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Notification Sidebar */}
      <NotificationSidebar 
        isOpen={notificationSidebarOpen} 
        onClose={() => setNotificationSidebarOpen(false)} 
      />

      {/* Main Content */}
      <main className={`flex-1 min-h-screen w-full pb-20 lg:pb-0 transition-all duration-300 ${
        sidebarHidden 
          ? "ml-0" 
          : sidebarCollapsed 
            ? "lg:ml-16 ml-0" 
            : "lg:ml-64 ml-0"
      }`}>
        {/* Header */}
        <AppHeader onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

        {/* Content Area */}
        <div className="w-full max-w-screen-xl mx-auto px-4 md:px-6 py-6 md:py-8">
          {/* Top Banner - Top 10 Trending Apps Carousel */}
          {loading ? (
            <div className="h-[200px] sm:h-[220px] md:h-64 bg-gray-900 rounded-3xl animate-pulse mb-6 md:mb-8" />
          ) : topApps.length > 0 ? (
            <Suspense fallback={<div className="h-[200px] sm:h-[220px] md:h-64 bg-gray-900 rounded-3xl animate-pulse mb-6 md:mb-8" />}>
              <TopBanner apps={topApps} />
            </Suspense>
          ) : null}

          {/* Promo Section */}
          <PromoSection />

          {/* Trending Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-8 md:mb-12"
          >
            <div className="flex items-center justify-between mb-6">
              <Link
                href="/apps/trending"
                className="text-2xl font-bold text-white hover:text-blue-400 transition-colors cursor-pointer"
              >
                Hot Mini Apps
              </Link>
              <Link
                href="/apps/trending"
                className="flex items-center gap-2 text-blue-400 hover:text-blue-300 font-semibold transition-colors"
              >
                See All
                <ChevronRight className="w-5 h-5" />
              </Link>
            </div>
            
            {loading ? (
              <div className="flex gap-4 overflow-x-auto pb-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="w-[280px] h-48 bg-gray-900 rounded-2xl animate-pulse flex-shrink-0" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 w-full">
                {trendingApps.length > 0 ? (
                  trendingApps.map((app, index) => (
                    <div key={app.id} className="w-full min-w-0">
                      <HorizontalAppCard app={app} />
                    </div>
                  ))
                ) : (
                  <div className="text-gray-400 text-center py-12 w-full col-span-2">
                    No trending apps available
                  </div>
                )}
              </div>
            )}
          </motion.section>

          {/* Popular Categories Section - Lazy loaded below fold */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
            className="mb-12 md:mb-16 mt-6 md:mt-10"
          >
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">Popular</h2>
              <Link
                href="/apps"
                className="text-blue-400 hover:text-blue-300 font-semibold transition-colors text-xs sm:text-sm md:text-base"
              >
                More →
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-4 md:gap-6 max-w-4xl mx-auto">
              <CategoryHighlightCard
                title="Game"
                featuredApp="Apple Run"
                ctaLabel="Open"
                gradientFrom="from-green-500"
                gradientTo="to-green-600"
                href="/apps?category=Games"
                backgroundImage="/category-bg/game-bg.webp"
              />
              <CategoryHighlightCard
                title="Social"
                featuredApp="WeChat"
                ctaLabel="Open"
                gradientFrom="from-red-500"
                gradientTo="to-red-600"
                href="/apps?category=Social"
                backgroundImage="/category-bg/social-bg.webp"
              />
              <CategoryHighlightCard
                title="Shopping"
                featuredApp="Shopping"
                ctaLabel="Open"
                gradientFrom="from-blue-500"
                gradientTo="to-indigo-600"
                href="/apps?category=Tools&tag=shopping"
                backgroundImage="/category-bg/shopping-bg.webp"
              />
              <CategoryHighlightCard
                title="Finance"
                featuredApp="Coinbase"
                ctaLabel="Open"
                gradientFrom="from-emerald-500"
                gradientTo="to-teal-600"
                href="/apps?category=Finance"
                backgroundImage="/category-bg/finance-bg.webp"
              />
              <CategoryHighlightCard
                title="Utility"
                featuredApp="Artyug"
                ctaLabel="Open"
                gradientFrom="from-slate-500"
                gradientTo="to-gray-600"
                href="/apps?category=Utilities"
                backgroundImage="/category-bg/utility-bg.webp"
              />
              <CategoryHighlightCard
                title="Tech"
                featuredApp="Tech"
                ctaLabel="Open"
                gradientFrom="from-blue-500"
                gradientTo="to-cyan-600"
                href="/apps?category=Tech"
                backgroundImage="/category-bg/tech-bg.webp"
              />
              <CategoryHighlightCard
                title="Entertainment"
                featuredApp="Entertainment"
                ctaLabel="Open"
                gradientFrom="from-pink-500"
                gradientTo="to-rose-600"
                href="/apps?category=Entertainment"
                backgroundImage="/category-bg/entertainment-bg.webp"
              />
              <CategoryHighlightCard
                title="News"
                featuredApp="News"
                ctaLabel="Open"
                gradientFrom="from-purple-500"
                gradientTo="to-violet-600"
                href="/apps?category=News"
                backgroundImage="/category-bg/news-bg.webp"
              />
              <CategoryHighlightCard
                title="Art"
                featuredApp="Art"
                ctaLabel="Open"
                gradientFrom="from-orange-500"
                gradientTo="to-amber-600"
                href="/apps?category=Art"
                backgroundImage="/category-bg/art-bg.webp"
              />
            </div>
          </motion.section>

          {/* Explore Apps Section - Lazy loaded below fold */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="mb-16 mt-10"
          >
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-8 w-1 bg-gradient-to-b from-[#0052FF] to-[#7C3AED] rounded-full"></div>
                <h2 className="text-2xl md:text-3xl font-bold text-white">Explore apps</h2>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 md:gap-6">
              {appCategories.map((category, index) => {
                // Map category names to background patterns
                const patternMap: Record<string, "action" | "puzzle" | "entertainment" | "social" | "communication"> = {
                  "Trending": "action",
                  "Action": "action",
                  "Puzzle": "puzzle",
                  "New Apps": "entertainment",
                  "Premium Apps": "action",
                  "Communication": "communication",
                  "Airdrop": "action",
                  "Prediction": "entertainment",
                  "Crowdfunding": "social",
                };
                
                // Use background image for Tools category
                const isTools = category.name === "Tools";
                
                return (
                  <CategoryCard
                    key={category.name}
                    name={category.name}
                    icon={category.icon}
                    color={category.color}
                    href={category.href}
                    backgroundPattern={isTools ? undefined : patternMap[category.name]}
                    backgroundImage={isTools ? "/category-bg/tools-bg.webp" : undefined}
                  />
                );
              })}
            </div>
          </motion.section>

          {/* Paid Developer Apps - Coming Soon Section - Lazy loaded below fold */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="mb-16 mt-10"
          >
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-8 w-1 bg-gradient-to-b from-purple-500 to-blue-600 rounded-full"></div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl md:text-3xl font-bold text-white">Paid Developer Apps</h2>
                  <div className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-purple-600/20 text-purple-300 border border-purple-500/40">
                    Launching Soon
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground ml-4">
                Premium developer tools and advanced features coming soon
              </p>
            </div>
            <Suspense fallback={<div className="h-64 bg-gray-900/50 rounded-xl animate-pulse" />}>
              <ComingSoonPremiumSection />
            </Suspense>
          </motion.section>
        </div>
      </main>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen bg-black">
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-base-blue"></div>
        </div>
      </div>
    }>
      <HomePageContent />
    </Suspense>
  );
}
