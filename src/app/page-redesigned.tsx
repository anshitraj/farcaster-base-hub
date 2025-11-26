"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import SearchBar from "@/components/SearchBar";
import CategoryCard from "@/components/CategoryCard";
import FeatureCard from "@/components/FeatureCard";
import AppCard from "@/components/AppCard";
import { motion } from "framer-motion";
import {
  Mic,
  Users,
  GraduationCap,
  Camera,
  ShoppingBag,
  Bell,
  Settings,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { trackPageView } from "@/lib/analytics";
import UserProfile from "@/components/UserProfile";

const categoryData = [
  { title: "Recreation", count: 12822, icon: Mic, color: "#EF4444" },
  { title: "Social", count: 3241445, icon: Users, color: "#10B981" },
  { title: "Education", count: 242425, icon: GraduationCap, color: "#3B82F6" },
  { title: "Photograph", count: 757546, icon: Camera, color: "#F59E0B" },
  { title: "Shop", count: 87865, icon: ShoppingBag, color: "#8B5CF6" },
];

const gradients = [
  "from-green-500 to-black",
  "from-blue-500 to-black",
  "from-red-500 to-black",
  "from-purple-500 to-black",
  "from-cyan-500 to-black",
];

const buttonColors = [
  "bg-green-500 hover:bg-green-600",
  "bg-blue-500 hover:bg-blue-600",
  "bg-red-500 hover:bg-red-600",
  "bg-purple-500 hover:bg-purple-600",
  "bg-cyan-500 hover:bg-cyan-600",
];

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [trendingApps, setTrendingApps] = useState<any[]>([]);
  const [newApps, setNewApps] = useState<any[]>([]);
  const [featuredApps, setFeaturedApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

        const [trendingData, newData] = await Promise.all([
          fetchWithErrorHandling("/api/apps/trending?limit=5"),
          fetchWithErrorHandling("/api/apps?sort=newest&limit=6"),
        ]);

        setTrendingApps(trendingData.apps || []);
        setNewApps(newData.apps || []);
        setFeaturedApps((trendingData.apps || []).slice(0, 5));
      } catch (error) {
        console.error("Error fetching data:", error);
        setTrendingApps([]);
        setNewApps([]);
        setFeaturedApps([]);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return (
    <div className="flex min-h-screen bg-[#121212]">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 ml-64 min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-[#121212]/95 backdrop-blur-xl border-b border-[#2A2A2A]">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm text-[#888] font-medium">iphone 7Plus</span>
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-[#1E1E1E] rounded-lg transition-colors">
                  <ArrowLeft className="w-4 h-4 text-[#AAA]" />
                </button>
                <button className="p-2 hover:bg-[#1E1E1E] rounded-lg transition-colors">
                  <ArrowRight className="w-4 h-4 text-[#AAA]" />
                </button>
                <button className="p-2 hover:bg-[#1E1E1E] rounded-lg transition-colors">
                  <RefreshCw className="w-4 h-4 text-[#AAA]" />
                </button>
              </div>
            </div>

            <div className="flex-1 max-w-md mx-8">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && searchQuery.trim()) {
                    window.location.href = `/apps?search=${encodeURIComponent(searchQuery.trim())}`;
                  }
                }}
                placeholder="Search application"
              />
            </div>

            <div className="flex items-center gap-4">
              <button className="p-2 hover:bg-[#1E1E1E] rounded-lg transition-colors">
                <Bell className="w-5 h-5 text-[#AAA]" />
              </button>
              <button className="p-2 hover:bg-[#1E1E1E] rounded-lg transition-colors">
                <Settings className="w-5 h-5 text-[#AAA]" />
              </button>
              <Link
                href="/submit"
                className="px-4 py-2 text-sm font-medium text-[#AAA] hover:text-white transition-colors"
              >
                Sign Up
              </Link>
              <div className="flex items-center">
                <UserProfile />
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-6">
          {/* SORT Section */}
          <section className="mb-8">
            <h2 className="text-xs font-semibold text-[#888] uppercase tracking-wider mb-4">
              SORT
            </h2>
            <div className="grid grid-cols-5 gap-4">
              {categoryData.map((category) => (
                <CategoryCard
                  key={category.title}
                  title={category.title}
                  count={category.count}
                  icon={category.icon}
                  iconColor={category.color}
                  onClick={() => {
                    window.location.href = `/apps?category=${category.title}`;
                  }}
                />
              ))}
            </div>
          </section>

          {/* POPULAR Section */}
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-semibold text-[#888] uppercase tracking-wider">
                POPULAR
              </h2>
              <Link
                href="/apps"
                className="text-sm text-base-blue hover:text-base-blue/80 transition-colors"
              >
                More →
              </Link>
            </div>
            <div className="grid grid-cols-5 gap-4 auto-rows-fr">
              {featuredApps.map((app, index) => (
                <FeatureCard
                  key={app.id}
                  id={app.id}
                  name={app.name}
                  description={app.description?.substring(0, 60)}
                  iconUrl={app.iconUrl}
                  gradient={gradients[index % gradients.length]}
                  buttonText="Open"
                  buttonColor={buttonColors[index % buttonColors.length]}
                  variant={index === 0 ? "large" : "medium"}
                />
              ))}
              {featuredApps.length === 0 && !loading && (
                <div className="col-span-5 text-center py-12 text-[#888]">
                  No featured apps available
                </div>
              )}
            </div>
          </section>

          {/* NEW Section */}
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-semibold text-[#888] uppercase tracking-wider">
                NEW
              </h2>
              <Link
                href="/apps?sort=newest"
                className="text-sm text-base-blue hover:text-base-blue/80 transition-colors"
              >
                More →
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {newApps.map((app) => (
                <motion.div
                  key={app.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl p-4 hover:border-[#3A3A3A] transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-[#2A2A2A] p-2 flex-shrink-0">
                      {app.iconUrl ? (
                        <img
                          src={app.iconUrl}
                          alt={app.name}
                          className="w-full h-full object-contain rounded"
                        />
                      ) : (
                        <div className="w-full h-full bg-base-blue/20 rounded flex items-center justify-center">
                          <span className="text-xs text-base-blue font-bold">
                            {app.name.charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-white mb-1 truncate">
                        {app.name}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-[#888]">
                        <span>{app.category || "Tool"}</span>
                        <span>•</span>
                        <span>112.2Mb</span>
                      </div>
                    </div>
                    <Link href={`/apps/${app.id}`}>
                      <button className="px-6 py-2 bg-base-blue text-white rounded-full text-sm font-semibold hover:bg-base-blue/90 transition-colors whitespace-nowrap">
                        Obtain
                      </button>
                    </Link>
                  </div>
                </motion.div>
              ))}
              {newApps.length === 0 && !loading && (
                <div className="text-center py-12 text-[#888]">
                  No new apps available
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

