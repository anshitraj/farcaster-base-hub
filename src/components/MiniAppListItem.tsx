"use client";

import Link from "next/link";
import Image from "next/image";
import { Star } from "lucide-react";
import FavoriteButton from "./FavoriteButton";

interface MiniAppListItemProps {
  id: string;
  icon: string;
  name: string;
  category?: string;
  tags?: string[];
  description?: string;
  ratingAverage?: number;
  ratingCount?: number;
  url?: string; // Main app URL
  farcasterUrl?: string; // Farcaster mini app URL
  baseMiniAppUrl?: string; // Base mini app URL
  onClick?: () => void;
}

export function MiniAppListItem({
  id,
  icon,
  name,
  category,
  tags,
  description,
  ratingAverage = 0,
  ratingCount = 0,
  url,
  farcasterUrl,
  baseMiniAppUrl,
  onClick,
}: MiniAppListItemProps) {
  const hasRating = ratingCount > 0 && ratingAverage > 0;
  const categoryText = category 
    ? category + (tags && tags.length > 0 ? ` • ${tags.slice(0, 2).map((tag) => {
        const formatted = tag
          .split(/(?=[A-Z])/)
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(" ");
        return formatted;
      }).join(" • ")}` : "")
    : tags && tags.length > 0
    ? tags.slice(0, 2).map((tag) => {
        const formatted = tag
          .split(/(?=[A-Z])/)
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(" ");
        return formatted;
      }).join(" • ")
    : null;

  return (
    <div className="flex items-center justify-between bg-[#0f1115] border border-white/5 rounded-2xl p-4 hover:bg-white/5 transition group">
      {/* Left side */}
      <div className="flex items-center gap-4 w-[70%] min-w-0">
        <div className="relative flex-shrink-0">
          <Image
            src={icon}
            alt={name}
            width={48}
            height={48}
            className="h-12 w-12 rounded-xl object-cover"
          />
        </div>
        <div className="flex flex-col flex-1 min-w-0">
          <h3 className="text-white font-semibold text-[16px] leading-tight truncate">
            {name}
          </h3>
          {categoryText && (
            <span className="text-xs text-white/40">{categoryText}</span>
          )}
          {description && (
            <p className="text-xs text-white/50 mt-0.5 truncate max-w-[180px]">
              {description}
            </p>
          )}
          {hasRating ? (
            <div className="flex items-center gap-1 mt-0.5">
              <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
              <span className="text-xs text-white/60">
                {(ratingAverage % 1 === 0) ? ratingAverage.toString() : ratingAverage.toFixed(1)}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-white/40">Not rated yet</span>
              <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full text-[10px] font-medium border border-green-500/30">
                New
              </span>
            </div>
          )}
        </div>
      </div>
      {/* Right side */}
      <div className="flex flex-col items-end gap-2 flex-shrink-0">
        <FavoriteButton appId={id} size="sm" />
        <Link
          href={`/apps/${id}`}
          onClick={onClick}
          className="px-4 py-1.5 rounded-full bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 transition shadow-md"
        >
          Open
        </Link>
      </div>
    </div>
  );
}

