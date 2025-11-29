"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import AppHeader from "@/components/AppHeader";
import { motion } from "framer-motion";
import { ChevronRight, Zap, Puzzle, Gift, TrendingUp, Coins, DollarSign, Wrench, Flame, Sparkles, Crown, MessageSquare } from "lucide-react";
import { trackPageView } from "@/lib/analytics";
import NotificationSidebar from "@/components/NotificationSidebar";
import TopBanner from "@/components/TopBanner";
import HorizontalAppCard from "@/components/HorizontalAppCard";
import { CategoryHighlightCard } from "@/components/CategoryHighlightCard";
import CategoryCard from "@/components/CategoryCard";
import ComingSoonPremiumSection from "@/components/ComingSoonPremiumSection";

// All app categories with icons (including game genres)
const appCategories = [
  // Trending at first position
  { name: "Trending", icon: Flame, color: "from-orange-500 to-red-600", href: "/apps?sort=trending" },
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
];

export default function HomePage() {
  const [topApps, setTopApps] = useState<any[]>([]);
  const [trendingApps, setTrendingApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarHidden, setSidebarHidden] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationSidebarOpen, setNotificationSidebarOpen] = useState(false);

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
    trackPageView("/");
  }, []);

  useEffect(() => {
    async function fetchData() {
      try {
        const fetchWithErrorHandling = async (url: string, fallback: any = []) => {
          try {
            const res = await fetch(url, { credentials: "include" });
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
        const trendingData = await fetchWithErrorHandling("/api/apps/trending?limit=10");
        let allTrendingApps = trendingData.apps || [];
        
        console.log("Trending API response:", { 
          count: allTrendingApps.length, 
          apps: allTrendingApps.map((a: any) => ({ id: a.id, name: a.name, status: a.status, featured: a.featuredInBanner }))
        });
        
        // If no trending apps, fetch recent approved apps as fallback
        if (allTrendingApps.length === 0) {
          console.log("No trending apps, fetching recent approved apps...");
          const recentData = await fetchWithErrorHandling("/api/apps?limit=10&sort=newest");
          allTrendingApps = recentData.apps || [];
          console.log("Recent apps response:", { 
            count: allTrendingApps.length, 
            apps: allTrendingApps.map((a: any) => ({ id: a.id, name: a.name, status: a.status }))
          });
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

    fetchData();
  }, []);

  return (
    <div className="flex min-h-screen bg-black">
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
        <div className="px-4 md:px-6 lg:px-8 py-6 md:py-8">
          {/* Top Banner - Top 10 Trending Apps Carousel */}
          {loading ? (
            <div className="h-64 bg-gray-900 rounded-3xl animate-pulse mb-8" />
          ) : topApps.length > 0 ? (
            <TopBanner apps={topApps} />
          ) : null}

          {/* Trending Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-10"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Trending</h2>
              <Link
                href="/apps?sort=trending"
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {trendingApps.length > 0 ? (
                  trendingApps.map((app, index) => (
                    <HorizontalAppCard key={app.id} app={app} />
                  ))
                ) : (
                  <div className="text-gray-400 text-center py-12 w-full col-span-2">
                    No trending apps available
                  </div>
                )}
              </div>
            )}
          </motion.section>

          {/* Popular Categories Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
            className="mb-16 mt-10"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl md:text-3xl font-bold text-white">Popular</h2>
              <Link
                href="/apps"
                className="text-blue-400 hover:text-blue-300 font-semibold transition-colors text-sm md:text-base"
              >
                More →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4 md:gap-6 max-w-4xl mx-auto">
              <CategoryHighlightCard
                title="Game"
                featuredApp="Apple Run"
                ctaLabel="Open"
                gradientFrom="from-green-500"
                gradientTo="to-green-600"
                href="/apps?category=Games"
                backgroundImage="/category-bg/game-bg.jpg"
              />
              <CategoryHighlightCard
                title="Music"
                featuredApp="Spotify"
                ctaLabel="Open"
                gradientFrom="from-blue-500"
                gradientTo="to-blue-600"
                href="/apps?category=Social&tag=music"
                backgroundImage="/category-bg/music-bg.jpg"
              />
              <CategoryHighlightCard
                title="Social"
                featuredApp="WeChat"
                ctaLabel="Open"
                gradientFrom="from-red-500"
                gradientTo="to-red-600"
                href="/apps?category=Social"
                backgroundImage="/category-bg/social-bg.jpg"
              />
              <CategoryHighlightCard
                title="Productivity"
                featuredApp="Notion"
                ctaLabel="Open"
                gradientFrom="from-blue-500"
                gradientTo="to-indigo-600"
                href="/apps?category=Tools&tag=productivity"
                backgroundImage="/category-bg/productivity-bg.jpg"
              />
              <CategoryHighlightCard
                title="Finance"
                featuredApp="Coinbase"
                ctaLabel="Open"
                gradientFrom="from-emerald-500"
                gradientTo="to-teal-600"
                href="/apps?category=Finance"
                backgroundImage="/category-bg/finance-bg.jpg"
              />
              <CategoryHighlightCard
                title="Utility"
                featuredApp="Artyug"
                ctaLabel="Open"
                gradientFrom="from-slate-500"
                gradientTo="to-gray-600"
                href="/apps?category=Utilities"
                backgroundImage="/category-bg/utility-bg.jpg"
              />
              <CategoryHighlightCard
                title="Tools"
                featuredApp="Tools"
                ctaLabel="Open"
                gradientFrom="from-cyan-500"
                gradientTo="to-blue-600"
                href="/apps?category=Tools"
                backgroundImage="/category-bg/productivity-bg.jpg"
              />
              <CategoryHighlightCard
                title="DeFi"
                featuredApp="DeFi"
                ctaLabel="Open"
                gradientFrom="from-yellow-500"
                gradientTo="to-orange-600"
                href="/apps?category=Finance&tag=defi"
                backgroundImage="/category-bg/finance-bg.jpg"
              />
              <CategoryHighlightCard
                title="Education"
                featuredApp="Education"
                ctaLabel="Open"
                gradientFrom="from-indigo-500"
                gradientTo="to-purple-600"
                href="/apps?category=Education"
                backgroundImage="/category-bg/productivity-bg.jpg"
              />
              <CategoryHighlightCard
                title="Entertainment"
                featuredApp="Entertainment"
                ctaLabel="Open"
                gradientFrom="from-pink-500"
                gradientTo="to-rose-600"
                href="/apps?category=Entertainment"
                backgroundImage="/category-bg/productivity-bg.jpg"
              />
              <CategoryHighlightCard
                title="News"
                featuredApp="News"
                ctaLabel="Open"
                gradientFrom="from-purple-500"
                gradientTo="to-violet-600"
                href="/apps?category=News"
                backgroundImage="/category-bg/productivity-bg.jpg"
              />
              <CategoryHighlightCard
                title="Art"
                featuredApp="Art"
                ctaLabel="Open"
                gradientFrom="from-orange-500"
                gradientTo="to-amber-600"
                href="/apps?category=Art"
                backgroundImage="/category-bg/productivity-bg.jpg"
              />
            </div>
          </motion.section>

          {/* Explore Apps Section */}
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
                
                return (
                  <CategoryCard
                    key={category.name}
                    name={category.name}
                    icon={category.icon}
                    color={category.color}
                    href={category.href}
                    backgroundPattern={patternMap[category.name]}
                  />
                );
              })}
            </div>
          </motion.section>

          {/* Paid Developer Apps - Coming Soon Section */}
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
            <ComingSoonPremiumSection />
          </motion.section>
        </div>
      </main>
    </div>
  );
}
