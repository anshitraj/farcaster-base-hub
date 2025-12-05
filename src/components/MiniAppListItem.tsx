"use client";

import Link from "next/link";
import Image from "next/image";
import { Star, CheckCircle2 } from "lucide-react";
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

  return (
    <Link
      href={`/apps/${id}`}
      onClick={onClick}
      className="flex items-center gap-4 bg-transparent border-none rounded-xl p-4 hover:bg-white/5 transition group overflow-hidden w-full max-w-full cursor-pointer"
    >
      {/* Left side - Large Logo (64px) */}
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
          width={64}
          height={64}
          className="w-16 h-16 rounded-xl object-cover shadow-lg"
          loading="lazy"
          quality={75}
        />
      </div>
      
      {/* Middle - Text block with proper hierarchy */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden justify-center">
        {/* Line 1: App Name + Verified Checkmark (White) */}
        <div className="flex items-center gap-1.5 mb-1">
          <h3 className="text-white font-bold text-base leading-tight truncate uppercase">
            {name}
          </h3>
          {verified && (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-white" />
          )}
        </div>

        {/* Line 2: Category Tags - Muted color #A4A4A4 */}
        {formattedTags && (
          <p className="text-xs mb-1.5 truncate" style={{ color: '#A4A4A4' }}>
            {formattedTags}
          </p>
        )}

        {/* Line 3: Short Description - Single line with ellipsis */}
        {description && (
          <p className="text-sm text-gray-300 mb-1.5 truncate leading-snug">
            {description}
          </p>
        )}

        {/* Line 4: Rating Row - Yellow star BEFORE number */}
        <div className="flex items-center justify-between">
          {hasRating ? (
            <div className="flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
              <span className="text-sm text-white font-medium">
                {(ratingAverage % 1 === 0) ? ratingAverage.toString() : ratingAverage.toFixed(1)}
              </span>
            </div>
          ) : (
            <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full text-[10px] font-medium border border-green-500/30 w-fit">
              New
            </span>
          )}
          
          {/* Save button - Below rating, aligned right */}
          <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <FavoriteButton appId={id} size="sm" />
          </div>
        </div>
      </div>
    </Link>
  );
}

