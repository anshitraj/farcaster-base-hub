"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Grid3x3,
  Gamepad2,
  Music,
  MoreHorizontal,
  Package,
  GamepadIcon,
  Camera,
  Heart,
  Plus,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { motion } from "framer-motion";

const menuItems = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/apps", icon: Grid3x3, label: "Application" },
  { href: "/apps?category=Games", icon: Gamepad2, label: "Game" },
  { href: "/apps?category=Social", icon: Music, label: "Music" },
];

const dataItems = [
  { href: "/submit", icon: Plus, label: "Submit App" },
  { href: "/favourites", icon: Heart, label: "My Favourites" },
  { href: "/games", icon: GamepadIcon, label: "My Game" },
  { href: "/dashboard", icon: Package, label: "My Applications" },
  { href: "/dashboard", icon: Camera, label: "My Media" },
];

interface SidebarProps {
  onCollapseChange?: (collapsed: boolean, hidden: boolean) => void;
}

export default function Sidebar({ onCollapseChange }: SidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHidden, setIsHidden] = useState(false);

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

  if (isHidden) {
    return (
      <button
        onClick={toggleHide}
        className="fixed left-0 top-1/2 -translate-y-1/2 z-50 bg-[#1A1A1A] border-r border-y border-[#2A2A2A] rounded-r-lg p-2 hover:bg-[#252525] transition-colors"
        aria-label="Show sidebar"
      >
        <ChevronRight className="w-5 h-5 text-[#AAA]" />
      </button>
    );
  }

  return (
    <motion.aside
        initial={{ x: -300 }}
        animate={{ x: 0 }}
        transition={{ duration: 0.3 }}
        className={`flex fixed left-0 top-0 h-screen bg-[#1A1A1A] border-r border-[#2A2A2A] z-40 transition-all duration-300 ${
          isCollapsed ? "w-16" : "w-64"
        }`}
      >
      <div className="flex flex-col h-full w-full">
        {/* Enhanced Header with Gradient */}
        <div className={`p-5 border-b border-[#2A2A2A]/50 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} bg-gradient-to-r from-[#1A1A1A] to-[#141414]`}>
          {!isCollapsed && (
            <motion.h2 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-lg font-extrabold bg-gradient-to-r from-white to-[#A0A4AA] bg-clip-text text-transparent"
            >
              Mini App Store
            </motion.h2>
          )}
          <div className={`flex items-center gap-2 ${isCollapsed ? 'flex-col' : ''}`}>
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
          </div>
        </div>

        {/* Menu Section */}
        <div className="flex-1 overflow-y-auto py-4">
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
                  key={item.href}
                  whileHover={{ x: 4 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <Link
                    href={item.href}
                    className={`relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
                      isActive
                        ? "bg-gradient-to-r from-base-blue/20 to-purple-500/10 text-white border-l-2 border-base-blue"
                        : "text-[#AAA] hover:bg-[#252525]/80 hover:text-white hover:border-l-2 hover:border-[#2A2A2A]"
                    }`}
                  >
                    {/* Active indicator glow */}
                    {isActive && (
                      <motion.div
                        layoutId="activeIndicator"
                        className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-base-blue to-purple-500 rounded-r-full"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                    <Icon className={`w-5 h-5 flex-shrink-0 transition-colors ${isActive ? "text-base-blue" : "group-hover:text-base-blue"}`} />
                    {!isCollapsed && (
                      <span className="text-sm font-semibold">{item.label}</span>
                    )}
                    {/* Hover shine effect */}
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 -translate-x-full group-hover:translate-x-full" />
                  </Link>
                </motion.div>
              );
            })}
          </nav>

          {/* Ad Banner Space */}
          {!isCollapsed && (
            <div className="px-4 mt-6 mb-4">
              <div className="bg-gradient-to-br from-purple-600/20 to-pink-500/20 border border-purple-500/30 rounded-2xl p-4 text-center">
                <div className="text-xs font-semibold text-purple-300 mb-2">Advertisement</div>
                <div className="h-32 bg-gray-800/50 rounded-xl flex items-center justify-center border border-gray-700">
                  <span className="text-xs text-gray-500">Ad Space</span>
                </div>
                <p className="text-xs text-gray-400 mt-2">Place your ads here</p>
              </div>
            </div>
          )}

          {/* Data Section */}
          <div className="px-4 mt-6 mb-4">
            {!isCollapsed && (
              <h3 className="text-xs font-semibold text-[#888] uppercase tracking-wider mb-3">
                DATA
              </h3>
            )}
          </div>
          <nav className="space-y-1 px-2">
            {dataItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              
              return (
                <motion.div
                  key={item.href}
                  whileHover={{ x: 4 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <Link
                    href={item.href}
                    className={`relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
                      isActive
                        ? "bg-gradient-to-r from-base-blue/20 to-purple-500/10 text-white border-l-2 border-base-blue"
                        : "text-[#AAA] hover:bg-[#252525]/80 hover:text-white hover:border-l-2 hover:border-[#2A2A2A]"
                    }`}
                  >
                    {/* Active indicator glow */}
                    {isActive && (
                      <motion.div
                        layoutId="activeIndicatorData"
                        className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-base-blue to-purple-500 rounded-r-full"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                    <Icon className={`w-5 h-5 flex-shrink-0 transition-colors ${isActive ? "text-base-blue" : "group-hover:text-base-blue"}`} />
                    {!isCollapsed && (
                      <>
                        <span className="text-sm font-semibold flex-1">{item.label}</span>
                        {item.badge !== null && item.badge !== undefined && (
                          <motion.span 
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="px-2.5 py-0.5 bg-gradient-to-r from-base-blue/30 to-purple-500/30 text-base-blue text-xs font-bold rounded-full border border-base-blue/30"
                          >
                            {item.badge}
                          </motion.span>
                        )}
                      </>
                    )}
                    {/* Hover shine effect */}
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 -translate-x-full group-hover:translate-x-full" />
                  </Link>
                </motion.div>
              );
            })}
          </nav>

        </div>
      </div>
    </motion.aside>
  );
}

