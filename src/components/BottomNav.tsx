"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Users, LayoutDashboard } from "lucide-react";
import { motion } from "framer-motion";

const navItems = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/apps", icon: Search, label: "Search" },
  { href: "/developers", icon: Users, label: "Developers" },
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-[100] bg-[#0B0F19]/95 backdrop-blur-xl border-t border-[#1F2733] safe-area-inset-bottom">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || 
            (item.href !== "/" && pathname?.startsWith(item.href));
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? "text-base-blue"
                  : "text-[#A0A4AA] hover:text-white"
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "text-base-blue" : ""}`} />
              <span className={`text-[10px] font-medium ${isActive ? "text-base-blue" : ""}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

