"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Pagination from "@/components/Pagination";
import AppHeader from "@/components/AppHeader";
import Sidebar from "@/components/Sidebar";
import CategoryChips from "@/components/CategoryChips";
import nextDynamic from "next/dynamic";

import { trackPageView, trackEvent } from "@/lib/analytics";
import { X } from "lucide-react";
import AppCard from "@/components/AppCard";

// Keep dynamic for search/filter functionality
export const dynamic = 'force-dynamic';

const ITEMS_PER_PAGE = 20;
const categories = ["Finance", "Tools", "Social", "Airdrops", "Games", "Memecoins", "Utilities", "Education", "Entertainment", "News", "Art", "Productivity", "Tech", "Shopping"];

function AppsPageContent() {
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
  const [showAllTags, setShowAllTags] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarHidden, setSidebarHidden] = useState(false);

  useEffect(() => {
    // Check for reduced motion preference client-side
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  // Sidebar state management - same as home page
  useEffect(() => {
    const checkMobile = () => {
      if (typeof window !== 'undefined') {
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
    <div className="flex min-h-screen bg-[#0D0F1A]">
      {/* Sidebar */}
      <Sidebar 
        onCollapseChange={handleSidebarChange}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content */}
      <main className={`flex-1 min-h-screen w-full pb-24 transition-all duration-300 ${
        sidebarHidden 
          ? "ml-0" 
          : sidebarCollapsed 
            ? "lg:ml-16 ml-0" 
            : "lg:ml-64 ml-0"
      }`}>
        <AppHeader onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <div className="pt-8 pb-8">
        <div className="max-w-7xl mx-auto px-6" style={{ padding: "24px" }}>
          <div className="mb-8">
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
          </div>

          {/* Category Chips */}
          <div className="mb-6">
            <CategoryChips
              categories={categories}
              selected={selectedCategory}
              onSelect={handleCategorySelect}
            />
          </div>

          {/* Tag Filters */}
          {availableTags.length > 0 && (
            <div className="mb-6">
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
              <div className="flex flex-wrap gap-2 items-center">
                {(showAllTags ? availableTags : availableTags.slice(0, 5)).map((tag) => (
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
                {availableTags.length > 5 && (
                  <button
                    onClick={() => setShowAllTags(!showAllTags)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 bg-gray-800 text-gray-300 border border-gray-700 hover:border-gray-600 hover:text-white"
                  >
                    {showAllTags ? "Show less" : "Show more"}
                  </button>
                )}
              </div>
            </div>
          )}

          {loading ? (
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-[90px] bg-gray-900 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : apps.length > 0 ? (
            <>
              <div className="space-y-2">
                {apps.map((app) => (
                  <AppCard
                    key={app.id}
                    id={app.id}
                    name={app.name}
                    description={app.description || "No description available"}
                    iconUrl={app.iconUrl || ""}
                    category={app.category || ""}
                    ratingAverage={app.ratingAverage || 0}
                    ratingCount={app.ratingCount || 0}
                    verified={app.verified || false}
                    tags={app.tags || []}
                    variant="horizontal"
                    url={app.url}
                    farcasterUrl={app.farcasterUrl}
                    baseMiniAppUrl={app.baseMiniAppUrl}
                  />
                ))}
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
            <div className="text-center py-20">
              <p className="text-gray-400">No apps found</p>
            </div>
          )}
        </div>
        </div>
      </main>
    </div>
  );
}

export default function AppsPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen bg-[#0D0F1A]">
        <AppHeader />
        <div className="flex-1 pt-8 pb-8">
          <div className="max-w-7xl mx-auto px-6" style={{ padding: "24px" }}>
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-[90px] bg-gray-900 rounded-lg animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
    }>
      <AppsPageContent />
    </Suspense>
  );
}
