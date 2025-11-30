"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Smartphone, Package, Award, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";

interface QuickShortcutsProps {
  onScrollToApps?: () => void;
  onScrollToBadges?: () => void;
}

export default function QuickShortcuts({ onScrollToApps, onScrollToBadges }: QuickShortcutsProps) {
  const router = useRouter();

  const handleClick = (action: string) => {
    switch (action) {
      case "submit":
        router.push("/submit");
        break;
      case "apps":
        if (onScrollToApps) {
          onScrollToApps();
        } else {
          // Fallback: scroll to apps section
          const appsSection = document.getElementById("apps-section");
          if (appsSection) {
            appsSection.scrollIntoView({ behavior: "smooth" });
          } else {
            router.push("/dashboard");
            setTimeout(() => {
              const section = document.getElementById("apps-section");
              if (section) {
                section.scrollIntoView({ behavior: "smooth" });
              }
            }, 100);
          }
        }
        break;
      case "badges":
        if (onScrollToBadges) {
          onScrollToBadges();
        } else {
          // Fallback: scroll to badges section or show badges
          const badgesSection = document.getElementById("badges-section");
          if (badgesSection) {
            badgesSection.scrollIntoView({ behavior: "smooth" });
          } else {
            // If no badges section, show developer's badges page
            router.push("/dashboard");
          }
        }
        break;
      case "analytics":
        // Analytics is a premium feature - redirect to premium page
        router.push("/premium");
        break;
    }
  };

  const shortcuts = [
    {
      label: "List your mini app",
      icon: Smartphone,
      action: "submit",
      color: "from-base-blue to-base-cyan",
    },
    {
      label: "Manage My Apps",
      icon: Package,
      action: "apps",
      color: "from-purple-500 to-pink-500",
    },
    {
      label: "View Badges",
      icon: Award,
      action: "badges",
      color: "from-yellow-500 to-orange-500",
    },
    {
      label: "View Analytics",
      icon: BarChart3,
      action: "analytics",
      color: "from-green-500 to-emerald-500",
    },
  ];

  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold mb-3">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-3">
        {shortcuts.map((shortcut, index) => {
          const Icon = shortcut.icon;
          return (
            <motion.div
              key={shortcut.action}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <Card 
                className="glass-card hover:bg-white/10 transition-all cursor-pointer border-white/10 hover:border-base-blue/50"
                onClick={() => handleClick(shortcut.action)}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className={`w-12 h-12 rounded-xl bg-gradient-to-br ${shortcut.color} flex items-center justify-center shadow-lg`}
                    >
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-xs font-medium text-center">
                      {shortcut.label}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

