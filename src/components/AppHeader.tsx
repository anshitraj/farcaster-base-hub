"use client";

import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Bell, Search } from "lucide-react";
import UserProfile from "@/components/UserProfile";
import PointsDisplay from "@/components/PointsDisplay";
import NotificationSidebar from "@/components/NotificationSidebar";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";

export default function AppHeader() {
  const [notificationSidebarOpen, setNotificationSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Initialize search query from URL
  useEffect(() => {
    const urlSearch = searchParams.get("search") || "";
    setSearchQuery(urlSearch);
  }, [searchParams]);

  // Debounce search query for real-time search (500ms delay)
  const debouncedSearch = useDebounce(searchQuery, 500);

  // Handle real-time search - update URL when debounced value changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (debouncedSearch.trim()) {
      params.set("search", debouncedSearch.trim());
      params.delete("page"); // Reset to page 1 on new search
    } else {
      params.delete("search");
    }
    
    const newUrl = `/apps?${params.toString()}`;
    
    // Only update URL if we're on apps page or home page
    if (pathname === "/apps") {
      router.replace(newUrl, { scroll: false });
    } else if (pathname === "/" && debouncedSearch.trim()) {
      // If on home page and user types, navigate to apps page
      router.push(newUrl);
    }
  }, [debouncedSearch, pathname, router, searchParams]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      // Navigate to apps page if not already there
      if (pathname !== "/apps") {
        const params = new URLSearchParams();
        if (searchQuery.trim()) {
          params.set("search", searchQuery.trim());
        }
        router.push(`/apps?${params.toString()}`);
      }
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-2xl border-b border-gray-800/50 shadow-lg">
        <div className="px-6 py-5 flex items-center justify-between gap-4">
          <Link 
            href="/" 
            className="text-2xl font-extrabold text-white hover:text-blue-400 transition-colors flex-shrink-0"
          >
            Mini App Store
          </Link>

          {/* Search Bar - Center */}
          <div className="flex-1 max-w-2xl mx-4 hidden md:block">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
              <Input
                type="text"
                placeholder="Search mini apps..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="pl-12 pr-4 h-11 rounded-full bg-gray-900 border border-gray-800 text-white placeholder:text-gray-500 focus-visible:ring-blue-500 focus-visible:ring-2 focus-visible:border-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Mobile Search Button */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="md:hidden p-2.5 hover:bg-gray-800 rounded-xl transition-all duration-300"
              onClick={() => router.push("/apps")}
              aria-label="Search"
            >
              <Search className="w-5 h-5 text-gray-300" />
            </motion.button>

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

      <NotificationSidebar 
        isOpen={notificationSidebarOpen} 
        onClose={() => setNotificationSidebarOpen(false)} 
      />
    </>
  );
}

