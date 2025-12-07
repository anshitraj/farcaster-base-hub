"use client";

import Link from "next/link";
import Image from "next/image";
import { Star, ExternalLink } from "lucide-react";
import FavoriteButton from "./FavoriteButton";
import { optimizeDevImage } from "@/utils/optimizeDevImage";

interface MiniAppListItemProps {
  id: string;
  icon: string;
  name: string;
  category?: string;
  tags?: string[];
  description?: string;
  ratingAverage?: number;
  ratingCount?: number;
  verified?: boolean;
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
  verified = false,
  url,
  farcasterUrl,
  baseMiniAppUrl,
  onClick,
}: MiniAppListItemProps) {
  // Format tags for display (e.g., "Games • Spin • Win")
  const formattedTags = tags && tags.length > 0 
    ? tags.slice(0, 4).map(tag => tag.charAt(0).toUpperCase() + tag.slice(1)).join(" • ")
    : category || "";

  const hasRating = ratingCount > 0 && ratingAverage > 0;

  // No longer needed - Open button now navigates to detail page
  // Removed handleOpenApp function that directly opened the app

  return (
    <div className="relative flex items-center gap-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-2 hover:bg-white/10 hover:border-white/20 transition-all group overflow-hidden w-full h-[90px]">
      {/* Save button - Top right */}
      <div className="absolute top-1 right-1 flex-shrink-0 z-10" onClick={(e) => e.stopPropagation()}>
        <FavoriteButton appId={id} size="sm" />
      </div>

      <Link
        href={`/apps/${id}`}
        onClick={onClick}
        className="flex items-center gap-2 w-full cursor-pointer pr-14"
      >
        {/* Left side - Small Logo (44px × 44px) */}
        <div className="relative flex-shrink-0">
          <Image
            src={optimizeDevImage(icon)}
            data-original={icon}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              const originalUrl = target.getAttribute("data-original");
              if (originalUrl) {
                target.src = originalUrl;
              } else {
                target.src = "/placeholder.svg";
              }
            }}
            alt={name}
            width={44}
            height={44}
            className="w-11 h-11 rounded-lg object-cover"
            loading="lazy"
            quality={75}
            sizes="44px"
          />
        </div>
        
        {/* Middle - Text block (Play Store style) */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden justify-center">
          {/* Line 1: App Name + Verified Badge + Rating */}
          <div className="flex items-center gap-1.5 mb-0.5">
            <h3 className="text-white font-semibold text-sm leading-tight truncate">
              {name}
            </h3>
            {verified && (
              <Image
                src="/verify.svg"
                alt="Verified"
                width={12}
                height={12}
                className="w-3 h-3 flex-shrink-0"
                title="Verified App"
              />
            )}
            {hasRating ? (
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
                <span className="text-[10px] text-gray-300">
                  {(ratingAverage % 1 === 0) ? ratingAverage.toString() : ratingAverage.toFixed(1)}
                </span>
              </div>
            ) : (
              <span className="text-[10px] text-green-400 font-medium flex-shrink-0">
                New
              </span>
            )}
          </div>

          {/* Line 2: Categories/Tags - Medium gray */}
          {formattedTags && (
            <p className="text-[10px] mb-0.5 truncate" style={{ color: '#9CA3AF' }}>
              {formattedTags}
            </p>
          )}

          {/* Line 3: Description - Muted, single line with ellipsis */}
          {description && (
            <p className="text-[10px] text-gray-400 truncate leading-tight" style={{ color: '#9CA3AF' }}>
              {description}
            </p>
          )}
        </div>
      </Link>

      {/* Open button - Bottom right */}
      <Link
        href={`/apps/${id}`}
        className="absolute right-2 bottom-1.5 bg-[#0052FF] hover:bg-[#0040CC] text-white px-2 py-0.5 rounded-md text-[10px] font-medium flex items-center gap-1 transition-colors flex-shrink-0 z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <ExternalLink className="w-2.5 h-2.5" />
        Open
      </Link>
    </div>
  );
}

