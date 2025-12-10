"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Star, Heart, AlertCircle } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import AppHeader from "@/components/AppHeader";
import FavoriteButton from "@/components/FavoriteButton";
import { shortenDescription } from "@/lib/description-utils";

export const dynamic = 'force-dynamic';

export default function FavouritesPage() {
  const [favouriteApps, setFavouriteApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarHidden, setSidebarHidden] = useState(false);

  // Initialize sidebar state based on screen size
  useEffect(() => {
    const checkMobile = () => {
      if (typeof window !== 'undefined') {
        if (window.innerWidth >= 1024) {
          // On desktop, always open by default
          setSidebarOpen(true);
        } else {
          // On mobile, always start closed
          setSidebarOpen(false);
        }
      }
    };
    
    if (typeof window !== 'undefined') {
      checkMobile();
    }
    
    const handleResize = () => {
      if (typeof window !== 'undefined') {
        if (window.innerWidth >= 1024) {
          // Always show on desktop
          setSidebarOpen(true);
        } else {
          // On mobile, close sidebar when resizing to mobile
          setSidebarOpen(false);
        }
      }
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

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
    let timeoutId: NodeJS.Timeout;
    
    async function fetchFavourites() {
      try {
        setError(null);
        setLoading(true);
        
        // Add timeout to prevent hanging (increased to 30 seconds for slow connections)
        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error("Request timeout")), 30000);
        });
        
        const fetchPromise = fetch("/api/collections", {
          credentials: "include",
          cache: "no-store", // Force fresh data
          signal: AbortSignal.timeout(30000), // 30 second timeout
        });
        
        const res = await Promise.race([fetchPromise, timeoutPromise]) as Response;
        
        if (res.ok) {
          const data = await res.json();
          
          // Debug logging
          console.log("Collections API response:", {
            collectionsCount: data.collections?.length || 0,
            collections: data.collections?.map((c: any) => ({
              type: c.type,
              itemsCount: c.items?.length || 0,
            })),
          });
          
          // Find the favorites collection
          const favoritesCollection = data.collections?.find(
            (col: any) => col.type === "favorites"
          );
          
          if (!favoritesCollection) {
            console.warn("No favorites collection found in response");
            setFavouriteApps([]);
            return;
          }
          
          // Get items from the favorites collection
          const items = favoritesCollection?.items || [];
          
          console.log("Favorites items:", {
            totalItems: items.length,
            items: items.map((item: any) => ({
              id: item.id,
              appId: item.miniApp?.id,
              appName: item.miniApp?.name,
            })),
          });
          
          // Filter out any items without a valid miniApp (in case app was deleted)
          const validItems = items.filter((item: any) => item.miniApp && item.miniApp.id);
          
          console.log("Valid items after filtering:", validItems.length);
          
          setFavouriteApps(validItems);
        } else if (res.status === 401) {
          setError("Please sign in to view your saved apps");
        } else {
          const errorData = await res.json().catch(() => ({}));
          console.error("Collections API error:", res.status, errorData);
          setError(errorData.error || "Failed to load saved apps. Please try again.");
        }
      } catch (error: any) {
        console.error("Error fetching favourites:", error);
        if (error.message === "Request timeout") {
          setError("Request timed out. Please check your connection and try again.");
        } else {
          setError("Failed to load saved apps. Please try again.");
        }
      } finally {
        clearTimeout(timeoutId);
        setLoading(false);
      }
    }

    fetchFavourites();
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  return (
    <div className="flex min-h-screen bg-black">
      {/* Sidebar */}
      <Sidebar 
        onCollapseChange={handleSidebarChange}
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
      />

      {/* Main Content */}
      <main className={`flex-1 min-h-screen w-full pb-20 lg:pb-0 transition-all duration-300 ${
        sidebarHidden 
          ? "ml-0" 
          : sidebarCollapsed 
            ? "lg:ml-16 ml-0" 
            : "lg:ml-64 ml-0"
      }`}>
        <AppHeader onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        
        {/* Page Header */}
        <div className="sticky top-[73px] z-40 bg-black/80 backdrop-blur-2xl border-b border-gray-800/50">
          <div className="px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500/20 to-pink-500/20 flex items-center justify-center border border-red-500/30">
                <Heart className="w-5 h-5 text-red-500 fill-red-500" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-white">Saved Apps</h1>
                <p className="text-sm text-gray-400">Your saved apps</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 md:px-6 lg:px-8 py-6 md:py-8">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-48 bg-gray-900 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4 border border-red-500/30">
                <AlertCircle className="w-10 h-10 text-red-500" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Error Loading Saved Apps</h2>
              <p className="text-gray-400 mb-6">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="inline-block px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-colors"
              >
                Try Again
              </button>
            </motion.div>
          ) : favouriteApps.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {favouriteApps.map((item, index) => (
                <motion.div
                  key={item.id || index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition-all duration-300 group"
                >
                  <div className="flex items-start gap-4 mb-4">
                    {item.miniApp?.iconUrl ? (
                      <div className="w-16 h-16 rounded-xl bg-gray-800 p-2 flex-shrink-0">
                        <img
                          src={item.miniApp.iconUrl}
                          alt={item.miniApp.name}
                          className="w-full h-full object-contain rounded-lg"
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-gray-800 flex items-center justify-center flex-shrink-0">
                        <span className="text-2xl font-bold text-gray-500">
                          {item.miniApp?.name?.charAt(0) || "?"}
                        </span>
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="text-lg font-bold text-white line-clamp-1 flex-1">
                          {item.miniApp?.name || "Unknown App"}
                        </h3>
                        <FavoriteButton appId={item.miniApp?.id || ""} size="md" className="flex-shrink-0 mt-0.5" />
                      </div>
                      <p className="text-sm text-gray-400 line-clamp-2 leading-relaxed">
                        {shortenDescription(item.miniApp?.description) || item.miniApp?.category || "No description available"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Link
                      href={item.miniApp ? `/apps/${item.miniApp.id}` : "#"}
                      className="px-6 py-2.5 bg-gray-800 hover:bg-gray-700 text-blue-400 rounded-lg text-sm font-semibold transition-all duration-300"
                    >
                      Open
                    </Link>
                    
                    <div className="flex items-center gap-2">
                      <Star className="w-5 h-5 text-yellow-400 fill-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" />
                      <span className="text-yellow-400 font-bold text-sm drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]">
                        {item.miniApp?.clicks || item.miniApp?.installs || 50}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <div className="w-20 h-20 rounded-full bg-gray-900 flex items-center justify-center mx-auto mb-4 border border-gray-800">
                <Heart className="w-10 h-10 text-gray-600" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">No saved apps yet</h2>
              <p className="text-gray-400 mb-6">Start saving apps to your list!</p>
              <Link
                href="/apps"
                className="inline-block px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-colors"
              >
                Browse Apps
              </Link>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}

