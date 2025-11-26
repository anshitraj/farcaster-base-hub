"use client";

import { Crown } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PremiumBadgeProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export default function PremiumBadge({ className = "", size = "md" }: PremiumBadgeProps) {
  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-1",
    lg: "text-base px-3 py-1.5",
  };

  return (
    <Badge
      className={`bg-gradient-to-r from-purple-600/20 to-base-blue/20 text-purple-300 border-purple-500/50 ${sizeClasses[size]} font-semibold flex items-center gap-1 ${className}`}
    >
      <Crown className={`${size === "sm" ? "w-3 h-3" : size === "md" ? "w-3.5 h-3.5" : "w-4 h-4"}`} />
      <span>Premium</span>
    </Badge>
  );
}

