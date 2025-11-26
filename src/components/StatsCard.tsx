"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Download, Eye, Star, Award } from "lucide-react";
import { motion } from "framer-motion";

interface StatsCardProps {
  totalApps: number;
  totalInstalls: number;
  totalClicks: number;
  totalRatings: number;
  totalBadges: number;
}

export default function StatsCard({
  totalApps,
  totalInstalls,
  totalClicks,
  totalRatings,
  totalBadges,
}: StatsCardProps) {
  const stats = [
    {
      label: "Apps Launched",
      value: totalApps,
      icon: TrendingUp,
      color: "text-base-blue",
    },
    {
      label: "Total Installs",
      value: totalInstalls,
      icon: Download,
      color: "text-green-400",
    },
    {
      label: "App Views",
      value: totalClicks,
      icon: Eye,
      color: "text-base-cyan",
    },
    {
      label: "Ratings Received",
      value: totalRatings,
      icon: Star,
      color: "text-yellow-500",
    },
    {
      label: "Badges Earned",
      value: totalBadges,
      icon: Award,
      color: "text-purple-400",
    },
  ];

  return (
    <Card className="glass-card mb-6">
      <CardHeader>
        <CardTitle className="text-base">Developer Stats</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="p-3 rounded-lg bg-white/5 border border-white/10"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                  <span className="text-xs text-muted-foreground">
                    {stat.label}
                  </span>
                </div>
                <div className={`text-2xl font-bold ${stat.color}`}>
                  {stat.value.toLocaleString()}
                </div>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

