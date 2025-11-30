"use client";

import { AlertTriangle } from "lucide-react";

interface UnverifiedBadgeProps {
  className?: string;
  iconOnly?: boolean;
  size?: "sm" | "md" | "lg";
}

export default function UnverifiedBadge({ 
  className = "", 
  iconOnly = false,
  size = "md"
}: UnverifiedBadgeProps) {
  const sizeClasses = {
    sm: "w-3.5 h-3.5",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  const iconSizes = {
    sm: "w-2 h-2",
    md: "w-2.5 h-2.5",
    lg: "w-3 h-3",
  };

  // Icon-only mode
  if (iconOnly) {
    return (
      <span
        className={`inline-flex items-center justify-center rounded-full bg-orange-500 ${sizeClasses[size]} flex-shrink-0 ${className}`}
        title="Unverified App"
        role="img"
        aria-label="Unverified App"
      >
        <AlertTriangle className={`${iconSizes[size]} text-white stroke-[3]`} />
      </span>
    );
  }

  // Full badge mode
  return (
    <span
      className={`inline-flex items-center gap-1.5 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-full px-2 py-0.5 text-xs font-medium ${className}`}
    >
      <span className="inline-flex items-center justify-center rounded-full bg-orange-500 w-3 h-3 flex-shrink-0">
        <AlertTriangle className="w-1.5 h-1.5 text-white stroke-[3]" />
      </span>
      Unverified App
    </span>
  );
}

