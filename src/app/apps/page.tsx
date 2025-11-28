"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Pagination from "@/components/Pagination";
import AppHeader from "@/components/AppHeader";
import CategoryChips from "@/components/CategoryChips";
import { motion } from "framer-motion";
import { trackPageView, trackEvent } from "@/lib/analytics";
import { Star, X, CheckCircle2, Flame, Sparkles } from "lucide-react";
import FavoriteButton from "@/components/FavoriteButton";
import VerifiedBadge from "@/components/VerifiedBadge";
import { shortenDescription } from "@/lib/description-utils";

const ITEMS_PER_PAGE = 20;
const categories = ["Finance", "Tools", "Social", "Airdrops", "Games", "Memecoins", "Utilities"];

export default function AppsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(searchParams.get("category") || null);
  const [selectedTag, setSelectedTag] = useState<string | null>(searchParams.get("tag") || null);
  const [searchQuery, setSearchQuery] = useState<string>(searchParams.get("search") || "");
  const [sortBy, setSortBy] = useState(searchParams.get("sort") || "newest");
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get("page") || "1", 10));
  const [apps, setApps] = useState<any[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    trackPageView("/apps");
    // Initialize from URL params
    setSelectedCategory(searchParams.get("category") || null);
    setSelectedTag(searchParams.get("tag") || null);
    setSearchQuery(searchParams.get("search") || "");
    setSortBy(searchParams.get("sort") || "newest");
    setCurrentPage(parseInt(searchParams.get("page") || "1", 10));
  }, [searchParams]);

  useEffect(() => {
    async function fetchApps() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        // Filter by category if selected
        if (selectedCategory) {
          params.set("category", selectedCategory);
        }
        // Filter by tag if selected
        if (selectedTag) {
          params.set("tag", selectedTag);
        }
        // Add search query if present
        if (searchQuery.trim()) {
          params.set("search", searchQuery.trim());
        }
        params.set("sort", sortBy);
        params.set("limit", ITEMS_PER_PAGE.toString());
        params.set("offset", ((currentPage - 1) * ITEMS_PER_PAGE).toString());
        
        const res = await fetch(`/api/apps?${params.toString()}`);
        const data = await res.json();
        setApps(data.apps || []);
        setTotal(data.total || 0);
        
        // Extract unique tags from apps
        const tags = new Set<string>();
        (data.apps || []).forEach((app: any) => {
          if (app.tags && Array.isArray(app.tags)) {
            app.tags.forEach((tag: string) => tags.add(tag));
          }
        });
        setAvailableTags(Array.from(tags).sort());
      } catch (error) {
        console.error("Error fetching apps:", error);
        trackEvent({
          action: "error",
          category: "apps",
          label: "fetch_failed",
        });
      } finally {
        setLoading(false);
      }
    }

    fetchApps();
  }, [selectedCategory, selectedTag, searchQuery, sortBy, currentPage]);

  const updateURL = (updates: { sort?: string; page?: number; category?: string | null; tag?: string | null }) => {
    const params = new URLSearchParams(searchParams.toString());
    if (updates.sort) params.set("sort", updates.sort);
    if (updates.page !== undefined) {
      if (updates.page > 1) params.set("page", updates.page.toString());
      else params.delete("page");
    }
    if (updates.category !== undefined) {
      if (updates.category) params.set("category", updates.category);
      else params.delete("category");
    }
    if (updates.tag !== undefined) {
      if (updates.tag) params.set("tag", updates.tag);
      else params.delete("tag");
    }
    router.push(`/apps?${params.toString()}`);
  };

  const handleCategorySelect = (category: string | null) => {
    setSelectedCategory(category);
    setCurrentPage(1);
    updateURL({ category, page: 1 });
  };

  const handleTagSelect = (tag: string | null) => {
    setSelectedTag(tag);
    setCurrentPage(1);
    updateURL({ tag, page: 1 });
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    updateURL({ page });
    trackEvent({
      action: "pagination",
      category: "apps",
      label: `page_${page}`,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

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
            <h1 className="text-3xl md:text-4xl font-bold mb-2 text-white">
              {searchQuery ? `Search Results for "${searchQuery}"` : selectedCategory ? `${selectedCategory} Apps` : "All Applications"}
            </h1>
            <p className="text-gray-400 text-sm">
              {searchQuery 
                ? `Found ${total} result${total !== 1 ? 's' : ''}`
                : selectedCategory 
                ? `Browse all ${selectedCategory.toLowerCase()} mini apps`
                : "Browse all available mini apps"}
            </p>
          </motion.div>

          {/* Category Chips */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="mb-6"
          >
            <CategoryChips
              categories={categories}
              selected={selectedCategory}
              onSelect={handleCategorySelect}
            />
          </motion.div>

          {/* Tag Filters */}
          {availableTags.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="mb-6"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-semibold text-gray-300">Tags:</span>
                {selectedTag && (
                  <button
                    onClick={() => handleTagSelect(null)}
                    className="flex items-center gap-1 px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-medium hover:bg-blue-500/30 transition-colors"
                  >
                    {selectedTag}
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {availableTags.slice(0, 20).map((tag) => (
                  <button
                    key={tag}
                    onClick={() => handleTagSelect(selectedTag === tag ? null : tag)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${
                      selectedTag === tag
                        ? "bg-blue-500 text-white border border-blue-400"
                        : "bg-gray-800 text-gray-300 border border-gray-700 hover:border-gray-600 hover:text-white"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {loading ? (
            <div className="space-y-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-900 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : apps.length > 0 ? (
            <>
              <div className="space-y-4">
                {apps.map((app, index) => {
                  const rating = app.ratingAverage || 0;
                  
                  return (
                    <motion.div
                      key={app.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.03 }}
                      className="group relative bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-all duration-300"
                    >
                      <div className="flex items-center gap-4">
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
                          {/* Favorite Button - Top Right on Mobile, Inline on Desktop */}
                          <div className="absolute top-0 right-0 md:relative md:top-auto md:right-auto z-10">
                            <FavoriteButton 
                              appId={app.id} 
                              size="md" 
                              className="flex-shrink-0 md:mt-1" 
                            />
                          </div>
                          <div className="pr-10 md:pr-0">
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div className="flex-1 min-w-0">
                                <h3 className="text-lg font-bold text-white mb-1 line-clamp-1">
                                  {app.name}
                                </h3>
                                <p className="text-sm text-gray-400 line-clamp-2 leading-relaxed">
                                  {shortenDescription(app.description) || "No description available"}
                                </p>
                              </div>
                            </div>

                            {/* Rating and Action Button Row */}
                            <div className="flex items-center justify-between mt-3">
                              <div className="flex items-center gap-2">
                                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                <span className="text-sm font-semibold text-white">
                                  {(rating % 1 === 0) ? rating.toString() : rating.toFixed(1)}
                                </span>
                              </div>

                              <Link
                                href={`/apps/${app.id}`}
                                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition-all duration-300"
                              >
                                Open
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
              
              {totalPages > 1 && (
                <div className="mt-8">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="text-center py-20"
            >
              <p className="text-gray-400">No apps found</p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
