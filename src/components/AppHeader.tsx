"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Bell, Search, Plus, Menu } from "lucide-react";
import UserProfile from "@/components/UserProfile";
import PointsDisplay from "@/components/PointsDisplay";
import XPSDisplay from "@/components/XPSDisplay";
import NotificationSidebar from "@/components/NotificationSidebar";
import GasPriceDisplay from "@/components/GasPriceDisplay";
import { useState, useEffect, Suspense } from "react";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";

interface AppHeaderProps {
  onMenuClick?: () => void;
}

function AppHeaderContent({ onMenuClick }: AppHeaderProps) {
  const [notificationSidebarOpen, setNotificationSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [unreadCount, setUnreadCount] = useState<number | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Initialize search query from URL
  useEffect(() => {
    try {
      const urlSearch = searchParams?.get("search") || "";
      setSearchQuery(urlSearch);
    } catch (error) {
      // Ignore errors during SSR
    }
  }, [searchParams]);

  // Fetch unread notification count
  useEffect(() => {
    async function fetchUnreadCount() {
      try {
        const res = await fetch("/api/notifications?unread=true&limit=1", {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          const count = data.unreadCount || 0;
          setUnreadCount(count > 0 ? count : null);
        } else {
          setUnreadCount(null);
        }
      } catch (error) {
        console.error("Error fetching unread count:", error);
      }
    }

    fetchUnreadCount();
    // Refresh every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Debounce search query for real-time search (500ms delay)
  const debouncedSearch = useDebounce(searchQuery, 500);

  // Handle real-time search - update URL when debounced value changes
  useEffect(() => {
    try {
      if (!searchParams) return;
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
    } catch (error) {
      // Ignore errors during SSR
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
        <div className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-5 flex items-center gap-2 sm:gap-3 md:gap-4">
          {/* Left Side: Menu Button + Logo */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {/* Mobile Menu Button */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onMenuClick}
              className="lg:hidden p-2 sm:p-2.5 hover:bg-gray-800 rounded-xl transition-all duration-300"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5 sm:w-6 sm:h-6 text-gray-300" />
            </motion.button>

            <Link 
              href="/" 
              className="flex-shrink-0 hover:opacity-80 transition-opacity"
            >
              <Image
                src="/logo.png"
                alt="Mini App Store"
                width={300}
                height={100}
                className="h-14 sm:h-12 md:h-14 lg:h-16 w-auto"
                priority
              />
            </Link>
          </div>

          {/* Search Bar - Center */}
          <div className="flex-1 max-w-2xl mx-2 sm:mx-4 hidden md:block">
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

          <div className="flex items-center gap-1 sm:gap-1.5 md:gap-3 flex-shrink-0">
            {/* List a Project Button */}
            <Link href="/submit">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="hidden md:flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1E3A5F] border border-[#2A5F8F] text-white hover:bg-[#2A5F8F] transition-all duration-300"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm font-semibold">List your mini app</span>
              </motion.button>
            </Link>

            {/* Mobile Search Button */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="md:hidden p-1.5 sm:p-2 hover:bg-gray-800 rounded-xl transition-all duration-300"
              onClick={() => router.push("/search")}
              aria-label="Search"
            >
              <Search className="w-4 h-4 sm:w-5 sm:h-5 text-gray-300" />
            </motion.button>

            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="relative p-1.5 sm:p-2 hover:bg-gray-800 rounded-xl transition-all duration-300"
              onClick={() => setNotificationSidebarOpen(true)}
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-gray-300" />
              {unreadCount !== null && unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] sm:min-w-[18px] sm:h-[18px] bg-red-500 rounded-full flex items-center justify-center text-[8px] sm:text-[10px] font-bold text-white px-0.5 sm:px-1.5 border-2 border-black shadow-lg">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </motion.button>
            {/* Gas Price Display - Always visible */}
            <GasPriceDisplay />
            {/* XPS Display - Always visible */}
            <XPSDisplay />
            {/* Points Display - Always visible */}
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

export default function AppHeader({ onMenuClick }: AppHeaderProps) {
  return (
    <Suspense fallback={
      <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-2xl border-b border-gray-800/50 shadow-lg">
        <div className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-5 flex items-center gap-2 sm:gap-3 md:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <Link href="/" className="flex-shrink-0">
              <Image
                src="/logo.png"
                alt="Mini App Store"
                width={300}
                height={100}
                className="h-10 sm:h-12 md:h-14 lg:h-16 w-auto"
                priority
              />
            </Link>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
            <div className="h-10 w-32 bg-gray-800 rounded animate-pulse" />
            <div className="h-10 w-10 bg-gray-800 rounded animate-pulse" />
          </div>
        </div>
      </header>
    }>
      <AppHeaderContent onMenuClick={onMenuClick} />
    </Suspense>
  );
}

