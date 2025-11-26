"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Grid3x3,
  Gamepad2,
  Image as ImageIcon,
  Palette,
  Music,
  Video,
  BookOpen,
  MessageSquare,
  MoreHorizontal,
  Download,
  Package,
  GamepadIcon,
  Book,
  Camera,
  HardDrive,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const menuItems = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/apps", icon: Grid3x3, label: "Application" },
  { href: "/apps?category=Games", icon: Gamepad2, label: "Game" },
  { href: "/apps?category=Tools", icon: ImageIcon, label: "Wallpaper" },
  { href: "/apps?category=Tools", icon: Palette, label: "Theme" },
  { href: "/apps?category=Social", icon: Music, label: "Music" },
  { href: "/apps?category=Tools", icon: Video, label: "Video" },
  { href: "/apps?category=Social", icon: BookOpen, label: "Fiction" },
  { href: "/apps", icon: MessageSquare, label: "Forum" },
  { href: "/apps", icon: MoreHorizontal, label: "Other" },
];

const dataItems = [
  { href: "/dashboard", icon: Download, label: "My backup" },
  { href: "/dashboard", icon: Package, label: "My Applications" },
  { href: "/dashboard", icon: GamepadIcon, label: "My Game" },
  { href: "/developers", icon: Book, label: "Address Book", badge: null },
  { href: "/dashboard", icon: Camera, label: "My Media" },
];

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const pathname = usePathname();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          />

          {/* Menu Drawer */}
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed left-0 top-0 h-screen w-64 bg-[#1A1A1A] border-r border-[#2A2A2A] z-50 lg:hidden overflow-y-auto"
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="p-4 border-b border-[#2A2A2A] flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">Mini App Store</h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-[#2A2A2A] rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              {/* Menu Section */}
              <div className="flex-1 overflow-y-auto py-4">
                <div className="px-4 mb-4">
                  <h3 className="text-xs font-semibold text-[#888] uppercase tracking-wider mb-3">
                    MENU
                  </h3>
                </div>
                <nav className="space-y-1 px-2">
                  {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href || 
                      (item.href !== "/" && pathname?.startsWith(item.href.split("?")[0]));
                    
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                          isActive
                            ? "bg-[#2A2A2A] text-white"
                            : "text-[#AAA] hover:bg-[#252525] hover:text-white"
                        }`}
                      >
                        <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? "text-base-blue" : ""}`} />
                        <span className="text-sm font-medium">{item.label}</span>
                      </Link>
                    );
                  })}
                </nav>

                {/* Data Section */}
                <div className="px-4 mt-6 mb-4">
                  <h3 className="text-xs font-semibold text-[#888] uppercase tracking-wider mb-3">
                    DATA
                  </h3>
                </div>
                <nav className="space-y-1 px-2">
                  {dataItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all relative ${
                          isActive
                            ? "bg-[#2A2A2A] text-white"
                            : "text-[#AAA] hover:bg-[#252525] hover:text-white"
                        }`}
                      >
                        <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? "text-base-blue" : ""}`} />
                        <span className="text-sm font-medium flex-1">{item.label}</span>
                        {item.badge !== null && item.badge !== undefined && (
                          <span className="px-2 py-0.5 bg-base-blue/20 text-base-blue text-xs rounded-full">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </nav>

              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

