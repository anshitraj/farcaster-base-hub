"use client";

import { Check } from "lucide-react";

interface VerifiedBadgeProps {
  type?: "developer" | "app";
  className?: string;
  iconOnly?: boolean; // Show only icon, no text
  size?: "sm" | "md" | "lg"; // Size variants
}

export default function VerifiedBadge({ 
  type = "developer", 
  className = "", 
  iconOnly = false,
  size = "md"
}: VerifiedBadgeProps) {
  // Size mappings
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

  // Icon-only mode - blue circular badge with white checkmark (inspired by standard verified badges)
  if (iconOnly) {
    return (
      <span
        className={`inline-flex items-center justify-center rounded-full bg-[#1DA1F2] ${sizeClasses[size]} flex-shrink-0 ${className}`}
        title={type === "developer" ? "Verified Developer" : "Verified App"}
        role="img"
        aria-label={type === "developer" ? "Verified Developer" : "Verified App"}
      >
        <Check className={`${iconSizes[size]} text-white stroke-[3]`} />
      </span>
    );
  }

  // Full badge mode (for apps or when explicitly needed)
  return (
    <span
      className={`inline-flex items-center gap-1.5 bg-[#0052FF]/20 text-[#855DCD] border border-[#00C2FF]/30 rounded-full px-2 py-0.5 text-xs font-medium ${className}`}
    >
      <span className="inline-flex items-center justify-center rounded-full bg-[#1DA1F2] w-3 h-3 flex-shrink-0">
        <Check className="w-1.5 h-1.5 text-white stroke-[3]" />
      </span>
      {type === "developer" ? "Verified Developer" : "Verified App"}
    </span>
  );
}

