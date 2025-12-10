"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Home,
  Heart,
  ChevronLeft,
  ChevronRight,
  X,
  ChevronDown,
  ChevronUp,
  Compass,
  Trophy,
  Award,
  LayoutDashboard,
  PlusCircle,
  BadgeCheck,
  Settings,
} from "lucide-react";
import GasPriceDisplay from "@/components/GasPriceDisplay";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

const menuItems = [
  { href: "/", icon: Home, label: "Home" },
];

interface CollapsibleSection {
  label: string;
  icon: any;
  items: { href: string; label: string }[];
}

const collapsibleSections: CollapsibleSection[] = [
  {
    label: "Explore Web3",
    icon: Compass,
    items: [
      { href: "/apps", label: "All Apps" },
      { href: "/apps?category=Games", label: "Games" },
      { href: "/apps?category=Finance", label: "Finance" },
      { href: "/apps/trending", label: "Hot Mini Apps" },
      { href: "/apps?sort=installs", label: "Popular Apps" },
      { href: "/apps?sort=newest", label: "Newest Apps" },
      { href: "#", label: "Paid Developer Apps (Soon)" },
    ],
  },
  {
    label: "Developer Tools",
    icon: Settings,
    items: [
      { href: "/developer-dashboard", label: "Developer Dashboard" },
      { href: "/submit", label: "List Your Mini App" },
      { href: "/badges", label: "Claim Your Badge" },
      { href: "/developer-dashboard", label: "Manage Apps" },
    ],
  },
  {
    label: "Rankings",
    icon: Trophy,
    items: [
      { href: "/ranking", label: "User Rankings" },
      { href: "/apps/trending", label: "Top Rated" },
    ],
  },
  {
    label: "Rewards",
    icon: Award,
    items: [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/quests", label: "Quests" },
    ],
  },
];

const dataItems = [
  { href: "/favourites", icon: Heart, label: "Saved Apps" },
];

interface SidebarProps {
  onCollapseChange?: (collapsed: boolean, hidden: boolean) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ onCollapseChange, isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Ensure sidebar is visible on desktop on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      setIsHidden(false);
    }
  }, []);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    "Explore Web3": true, // Default to expanded
    "Developer Tools": true, // Default to expanded
    "Rewards": true, // Default to expanded
  });

  // Detect mobile on mount and resize - hydration safe
  useEffect(() => {
    const checkMobile = () => {
      if (typeof window !== "undefined") {
        setIsMobile(window.innerWidth < 1024);
      }
    };
    checkMobile();
    if (typeof window !== "undefined") {
      window.addEventListener("resize", checkMobile);
      return () => window.removeEventListener("resize", checkMobile);
    }
  }, []);

  const toggleCollapse = () => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    onCollapseChange?.(newCollapsed, isHidden);
  };

  const toggleHide = () => {
    const newHidden = !isHidden;
    setIsHidden(newHidden);
    onCollapseChange?.(isCollapsed, newHidden);
  };

  // On mobile, show overlay backdrop when sidebar is open
  const showBackdrop = isMobile && isOpen && !isHidden;

  // Close sidebar when clicking on a link on mobile
  const handleLinkClick = () => {
    if (isMobile) {
      onClose?.();
    }
  };

  // On desktop, if hidden, show a button to reveal it
  if (isHidden && !isMobile) {
    return (
      <button
        onClick={toggleHide}
        className="hidden lg:flex fixed left-0 top-1/2 -translate-y-1/2 z-50 bg-[#1A1A1A] border-r border-y border-[#2A2A2A] rounded-r-lg p-2 hover:bg-[#252525] transition-colors"
        aria-label="Show sidebar"
      >
        <ChevronRight className="w-5 h-5 text-[#AAA]" />
      </button>
    );
  }

  // On mobile, if not open, don't render the sidebar
  if (isMobile && !isOpen) {
    return null;
  }

  return (
    <>
      {/* Mobile Backdrop */}
      {showBackdrop && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      <motion.aside
        initial={false}
        animate={{
          x: isMobile
            ? isOpen && !isHidden ? 0 : -320
            : isHidden ? -320 : 0, // On desktop, only check isHidden, not isOpen
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className={`flex fixed left-0 top-0 h-screen bg-[#1A1A1A] border-r border-[#2A2A2A] z-50 lg:z-40 transition-all duration-300 ${
          isCollapsed && !isMobile ? "w-16" : "w-64"
        } ${isMobile ? "shadow-2xl" : ""}`}
      >
      <div className="flex flex-col h-full w-full">
        {/* Enhanced Header with Gradient */}
        <div className={`p-5 border-b border-[#2A2A2A]/50 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} bg-gradient-to-r from-[#1A1A1A] to-[#141414]`}>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-shrink-0"
            >
              <Image
                src="/logo.webp"
                alt="Mini App Store"
                width={300}
                height={100}
                className="h-12 sm:h-16 md:h-20 w-auto max-w-[200px]"
                priority
                unoptimized
              />
            </motion.div>
          )}
          {isCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-shrink-0"
            >
              <Image
                src="/logo.webp"
                alt="Mini App Store"
                width={64}
                height={64}
                className="h-12 w-12 object-contain"
                priority
                unoptimized
              />
            </motion.div>
          )}
          <div className={`flex items-center gap-2 flex-shrink-0 ${isCollapsed ? 'flex-col' : ''}`}>
            <motion.button
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.9 }}
              onClick={toggleCollapse}
              className="p-2 hover:bg-[#2A2A2A]/80 rounded-xl transition-all duration-300 hover:border border-[#2A2A2A]"
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4 text-[#AAA] hover:text-base-blue transition-colors" />
              ) : (
                <ChevronLeft className="w-4 h-4 text-[#AAA] hover:text-base-blue transition-colors" />
              )}
            </motion.button>
            {!isCollapsed && (
              <>
                {/* Mobile Close Button */}
                {isMobile && (
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={onClose}
                    className="p-2 hover:bg-red-500/20 rounded-xl transition-all duration-300 hover:border border-red-500/30"
                    aria-label="Close sidebar"
                  >
                    <X className="w-4 h-4 text-[#AAA] hover:text-red-400 transition-colors" />
                  </motion.button>
                )}
                {/* Desktop Hide Button */}
                {!isMobile && (
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={toggleHide}
                    className="p-2 hover:bg-red-500/20 rounded-xl transition-all duration-300 hover:border border-red-500/30"
                    aria-label="Hide sidebar"
                  >
                    <X className="w-4 h-4 text-[#AAA] hover:text-red-400 transition-colors" />
                  </motion.button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Menu Section */}
        <div className="flex-1 overflow-y-auto py-4 pb-6">
          {/* Gas Price Display in Sidebar - Above Menu */}
          {!isCollapsed && (
            <div className="px-4 mb-4">
              <div className="bg-[#141A24] border border-[#1F2733] rounded-lg p-2">
                <div className="flex items-center justify-center">
                  <GasPriceDisplay />
                </div>
              </div>
            </div>
          )}
          <div className="px-4 mb-4">
            {!isCollapsed && (
              <h3 className="text-xs font-semibold text-[#888] uppercase tracking-wider mb-3">
                MENU
              </h3>
            )}
          </div>
          <nav className="space-y-1 px-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || 
                (item.href !== "/" && pathname?.startsWith(item.href.split("?")[0]));
              
              return (
                <motion.div
                  key={`${item.href}-${item.label}`}
                  whileHover={{ x: 4 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <Link
                    href={item.href}
                    onClick={handleLinkClick}
                    className={`relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
                      isActive
                        ? "bg-[#1E3A5F] text-white border border-[#2A5F8F]"
                        : "text-[#AAA] hover:bg-[#252525]/80 hover:text-white"
                    }`}
                  >
                    <Icon className={`w-5 h-5 flex-shrink-0 transition-colors ${isActive ? "text-white" : "group-hover:text-white"}`} />
                    {!isCollapsed && (
                      <span className="text-sm font-semibold">{item.label}</span>
                    )}
                  </Link>
                </motion.div>
              );
            })}

            {/* Collapsible Sections */}
            {!isCollapsed && collapsibleSections.map((section) => {
              const Icon = section.icon;
              const isExpanded = expandedSections[section.label] || false;
              const hasActiveItem = section.items.some(item => {
                const itemPath = item.href.split("?")[0];
                return pathname === itemPath || pathname?.startsWith(itemPath);
              });

              return (
                <div key={section.label} className="mt-1">
                  <motion.button
                    onClick={() => setExpandedSections(prev => ({
                      ...prev,
                      [section.label]: !isExpanded
                    }))}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300 group ${
                      hasActiveItem
                        ? "bg-[#1E3A5F] text-white border border-[#2A5F8F]"
                        : "text-[#AAA] hover:bg-[#252525]/80 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-5 h-5 flex-shrink-0 transition-colors ${hasActiveItem ? "text-white" : "group-hover:text-white"}`} />
                      <span className="text-sm font-semibold">{section.label}</span>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-[#AAA]" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[#AAA]" />
                    )}
                  </motion.button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="pl-8 pt-1 space-y-1">
                          {section.items.map((item) => {
                            const itemPath = item.href.split("?")[0];
                            const isActive = pathname === itemPath || pathname?.startsWith(itemPath);
                            const isComingSoon = item.href === "#";
                            
                            if (isComingSoon) {
                              return (
                              <div
                                key={`${item.href}-${item.label}`}
                                  className="block px-4 py-2 rounded-lg text-sm opacity-60 cursor-not-allowed text-[#666]"
                                >
                                  {item.label}
                                </div>
                              );
                            }
                            
                            return (
                              <Link
                              key={`${item.href}-${item.label}`}
                                href={item.href}
                                onClick={handleLinkClick}
                                className={`block px-4 py-2 rounded-lg text-sm transition-all duration-300 ${
                                  isActive
                                    ? "text-white bg-[#1E3A5F]/50 border-l-2 border-[#2A5F8F]"
                                    : "text-[#AAA] hover:text-white hover:bg-[#252525]/50"
                                }`}
                              >
                                {item.label}
                              </Link>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </nav>

          {/* Data Section - Moved before Advertisement */}
          {!isCollapsed && dataItems.length > 0 && (
            <>
              <div className="px-4 mt-6 mb-4">
                <h3 className="text-xs font-semibold text-[#888] uppercase tracking-wider mb-3">
                  MY DATA
                </h3>
              </div>
              <nav className="space-y-1 px-2 mb-6">
                {dataItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || pathname?.startsWith(item.href);
                  
                  return (
                    <motion.div
                      key={item.href}
                      whileHover={{ x: 4 }}
                      transition={{ type: "spring", stiffness: 400 }}
                    >
                      <Link
                        href={item.href}
                        onClick={handleLinkClick}
                        className={`relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
                          isActive
                            ? "bg-[#1E3A5F] text-white border border-[#2A5F8F]"
                            : "text-[#AAA] hover:bg-[#252525]/80 hover:text-white"
                        }`}
                      >
                        <Icon className={`w-5 h-5 flex-shrink-0 transition-colors ${isActive ? "text-white" : "group-hover:text-white"}`} />
                        <span className="text-sm font-semibold">{item.label}</span>
                      </Link>
                    </motion.div>
                  );
                })}
              </nav>
            </>
          )}

        </div>
      </div>
    </motion.aside>
    </>
  );
}

