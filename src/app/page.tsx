"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { motion } from "framer-motion";
import { Bell, ChevronRight } from "lucide-react";
import { trackPageView } from "@/lib/analytics";
import UserProfile from "@/components/UserProfile";
import PointsDisplay from "@/components/PointsDisplay";
import NotificationSidebar from "@/components/NotificationSidebar";
import TopBanner from "@/components/TopBanner";
import HorizontalAppCard from "@/components/HorizontalAppCard";

export default function HomePage() {
  const [topApps, setTopApps] = useState<any[]>([]);
  const [viralApps, setViralApps] = useState<any[]>([]);
  const [indieApps, setIndieApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarHidden, setSidebarHidden] = useState(false);
  const [notificationSidebarOpen, setNotificationSidebarOpen] = useState(false);

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

        // Fetch trending apps - top 10 for banner carousel
        const trendingData = await fetchWithErrorHandling("/api/apps/trending?limit=10");
        const trendingApps = trendingData.apps || [];
        
        if (trendingApps.length > 0) {
          // Top 10 apps for the banner carousel (or all if less than 10)
          setTopApps(trendingApps.slice(0, 10));
          // Next apps for viral section (skip the top 10)
          setViralApps(trendingApps.slice(10, 16));
        }

        // Fetch games for indie section
        const gamesData = await fetchWithErrorHandling("/api/apps?category=Games&limit=8");
        setIndieApps(gamesData.apps || []);
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
      <Sidebar onCollapseChange={handleSidebarChange} />

      {/* Notification Sidebar */}
      <NotificationSidebar 
        isOpen={notificationSidebarOpen} 
        onClose={() => setNotificationSidebarOpen(false)} 
      />

      {/* Main Content */}
      <main className={`flex-1 min-h-screen w-full pb-20 lg:pb-0 transition-all duration-300 ${
        sidebarHidden ? "ml-0" : sidebarCollapsed ? "ml-16" : "ml-64"
      }`}>
        {/* Header */}
        <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-2xl border-b border-gray-800/50 shadow-lg">
          <div className="px-6 py-5 flex items-center justify-between">
            <Link 
              href="/" 
              className="text-2xl font-extrabold text-white hover:text-blue-400 transition-colors"
            >
              Mini App Store
            </Link>

            <div className="flex items-center gap-3">
              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="relative p-2.5 hover:bg-gray-800 rounded-xl transition-all duration-300"
                onClick={() => setNotificationSidebarOpen(true)}
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5 text-gray-300" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              </motion.button>
              <PointsDisplay />
              <UserProfile />
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="px-4 md:px-6 lg:px-8 py-6 md:py-8">
          {/* Top Banner - Top 10 Trending Apps Carousel */}
          {loading ? (
            <div className="h-64 bg-gray-900 rounded-3xl animate-pulse mb-8" />
          ) : topApps.length > 0 ? (
            <TopBanner apps={topApps} />
          ) : null}

          {/* Best Viral Apps and Games Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-10"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Best Viral Apps and Games</h2>
              <Link
                href="/apps"
                className="flex items-center gap-2 text-blue-400 hover:text-blue-300 font-semibold transition-colors"
              >
                See All
                <ChevronRight className="w-5 h-5" />
              </Link>
            </div>
            
            {loading ? (
              <div className="flex gap-4 overflow-x-auto pb-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="w-[280px] h-48 bg-gray-900 rounded-2xl animate-pulse flex-shrink-0" />
                ))}
              </div>
            ) : (
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4">
                {viralApps.length > 0 ? (
                  viralApps.map((app) => (
                    <HorizontalAppCard key={app.id} app={app} />
                  ))
                ) : (
                  <div className="text-gray-400 text-center py-12 w-full">
                    No viral apps available
                  </div>
                )}
              </div>
            )}
          </motion.section>

          {/* Indie Games Masterpieces Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mb-10"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Indie Games Masterpieces</h2>
              <Link
                href="/games"
                className="flex items-center gap-2 text-blue-400 hover:text-blue-300 font-semibold transition-colors"
              >
                See All
                <ChevronRight className="w-5 h-5" />
              </Link>
            </div>
            
            {loading ? (
              <div className="flex gap-4 overflow-x-auto pb-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="w-[280px] h-48 bg-gray-900 rounded-2xl animate-pulse flex-shrink-0" />
                ))}
              </div>
            ) : (
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4">
                {indieApps.length > 0 ? (
                  indieApps.map((app) => (
                    <HorizontalAppCard key={app.id} app={app} />
                  ))
                ) : (
                  <div className="text-gray-400 text-center py-12 w-full">
                    No indie games available
                  </div>
                )}
              </div>
            )}
          </motion.section>
        </div>
      </main>
    </div>
  );
}
