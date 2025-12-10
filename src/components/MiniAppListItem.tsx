"use client";

import Link from "next/link";
import Image from "next/image";
import { Star, ExternalLink } from "lucide-react";
import FavoriteButton from "./FavoriteButton";
import UnverifiedBadge from "./UnverifiedBadge";
import { optimizeDevImage, needsUnoptimized } from "@/utils/optimizeDevImage";

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
    <div 
      className="flex items-center justify-between p-3 rounded-2xl bg-[#10131B] border border-[#1A1F2E] hover:border-[#2A2F3E] transition-all duration-100 cursor-pointer touch-manipulation w-full"
      style={{ WebkitTapHighlightColor: 'transparent', maxHeight: '130px' }}
      onClick={onClick}
    >
      <Link
        href={`/apps/${id}`}
        className="flex items-center gap-3 flex-1 min-w-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* App Icon - 52px */}
        <div className="relative flex-shrink-0">
          <Image
            src={optimizeDevImage(icon)}
            data-original={icon}
            unoptimized={needsUnoptimized(optimizeDevImage(icon))}
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
            width={52}
            height={52}
            className="w-[52px] h-[52px] rounded-xl object-cover bg-background-secondary"
            loading="lazy"
            quality={75}
            sizes="52px"
          />
        </div>
        
        {/* Content Section */}
        <div className="flex flex-col justify-center space-y-0.5 overflow-hidden flex-1 min-w-0">
          {/* Title Row: Title + Verified + Rating */}
          <div className="flex items-center gap-1 overflow-hidden">
            <h3 className="text-white font-semibold text-[14px] overflow-hidden text-ellipsis whitespace-nowrap">
              {name}
            </h3>
            {verified ? (
              <Image
                src="/verify.svg"
                alt="Verified"
                width={14}
                height={14}
                className="w-[14px] h-[14px] flex-shrink-0"
                title="Verified App"
                loading="lazy"
              />
            ) : (
              <UnverifiedBadge iconOnly size="sm" className="flex-shrink-0" />
            )}
            {hasRating && (
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                <span className="text-yellow-400 text-[12px]">
                  {(ratingAverage % 1 === 0) ? ratingAverage.toString() : ratingAverage.toFixed(1)}
                </span>
              </div>
            )}
          </div>

          {/* Tags Row */}
          {formattedTags && (
            <p className="text-[11px] text-gray-400 whitespace-nowrap overflow-hidden text-ellipsis">
              {formattedTags}
            </p>
          )}

          {/* Description Row */}
          {description && (
            <p className="text-xs text-gray-400 overflow-hidden text-ellipsis whitespace-nowrap">
              {description}
            </p>
          )}
        </div>
      </Link>

      {/* Right Side: Save Icon + Open Button */}
      <div className="flex flex-col items-end gap-2 ml-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        {/* Save button - Top right */}
        <div className="z-10">
          <FavoriteButton appId={id} size="sm" />
        </div>
        
        {/* Open button - Right center */}
        <Link
          href={`/apps/${id}`}
          className="px-3 py-1.5 bg-[#0052FF] hover:bg-[#0040CC] text-white text-sm rounded-xl font-medium flex items-center gap-1 transition-colors z-10"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="w-3 h-3" />
          Open
        </Link>
      </div>
    </div>
  );
}

