"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import DeveloperCard from "@/components/DeveloperCard";
import AnimatedLoader from "@/components/AnimatedLoader";
import { motion, AnimatePresence } from "framer-motion";

// Skip static generation for this dynamic page
export const dynamic = 'force-dynamic';

function DevelopersPageContent() {
  const searchParams = useSearchParams();
  const [developers, setDevelopers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [sortBy, setSortBy] = useState(searchParams?.get("sort") || "apps");

  // Initial page load - wait for background/images to load
  useEffect(() => {
    // Wait for background and initial render
    const timer = setTimeout(() => {
      setInitialLoad(false);
    }, 1000); // Give time for background/assets to load

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    async function fetchDevelopers() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("sort", sortBy);
        params.set("limit", "50");

        const res = await fetch(`/api/developers?${params.toString()}`);
        const data = await res.json();
        setDevelopers(data.developers || []);
      } catch (error) {
        console.error("Error fetching developers:", error);
      } finally {
        setLoading(false);
      }
    }

    // Only fetch after initial page load
    if (!initialLoad) {
      fetchDevelopers();
    }
  }, [sortBy, initialLoad]);

  const handleSortChange = (newSort: string) => {
    setSortBy(newSort);
    // Update URL without page reload
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.set("sort", newSort);
    window.history.pushState({}, "", `?${params.toString()}`);
  };

  const showFullLoader = initialLoad || (loading && initialLoad);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <AnimatePresence mode="wait">
        {showFullLoader ? (
          <motion.div
            key="loader"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 bg-background flex items-center justify-center"
          >
            <AnimatedLoader />
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="pt-24 pb-12 px-4"
          >
            <div className="container mx-auto max-w-7xl">
              {/* Header */}
              <div className="mb-8">
                <h1 className="text-3xl md:text-4xl font-bold mb-2">
                  Developers
                </h1>
                <p className="text-muted-foreground">
                  Discover talented developers building on Base
                </p>
              </div>

              {/* Sort Options */}
              <div className="mb-6 flex gap-2 flex-wrap">
                <button
                  onClick={() => handleSortChange("apps")}
                  disabled={loading}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    sortBy === "apps"
                      ? "bg-base-blue text-white"
                      : "bg-background-secondary text-muted-foreground hover:bg-background-secondary/80"
                  } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  Most Apps
                </button>
                <button
                  onClick={() => handleSortChange("xp")}
                  disabled={loading}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    sortBy === "xp"
                      ? "bg-base-blue text-white"
                      : "bg-background-secondary text-muted-foreground hover:bg-background-secondary/80"
                  } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  Most XP
                </button>
                <button
                  onClick={() => handleSortChange("newest")}
                  disabled={loading}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    sortBy === "newest"
                      ? "bg-base-blue text-white"
                      : "bg-background-secondary text-muted-foreground hover:bg-background-secondary/80"
                  } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  Newest
                </button>
              </div>

              {/* Loading State (for sorting changes) */}
              {loading && !initialLoad && (
                <div className="text-center py-12">
                  <AnimatedLoader className="min-h-[200px]" />
                </div>
              )}

              {/* Developers Grid */}
              {!loading && developers.length === 0 && (
                <div className="text-center py-20">
                  <p className="text-muted-foreground">No developers found.</p>
                </div>
              )}

              {!loading && developers.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
                >
                  {developers.map((developer) => (
                    <DeveloperCard
                      key={developer.id}
                      id={developer.id}
                      name={developer.name}
                      avatar={developer.avatar}
                      wallet={developer.wallet}
                      badges={[]}
                      appCount={developer.appCount || 0}
                      verified={developer.verified}
                    />
                  ))}
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function DevelopersPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="flex items-center justify-center min-h-[60vh]">
          <AnimatedLoader />
        </div>
      </div>
    }>
      <DevelopersPageContent />
    </Suspense>
  );
}