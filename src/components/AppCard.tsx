"use client";

import { useCallback, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Star, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import RatingStars from "./RatingStars";
import VerifiedBadge from "./VerifiedBadge";
import UnverifiedBadge from "./UnverifiedBadge";
import Top30Badge from "./Top30Badge";
import AutoUpdateBadge from "./AutoUpdateBadge";
import RankBadge from "./RankBadge";
import SecuredBadge from "./SecuredBadge";
import FavoriteButton from "./FavoriteButton";
import { optimizeDevImage, needsUnoptimized } from "@/utils/optimizeDevImage";

interface AppCardProps {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  category: string;
  ratingAverage?: number;
  ratingCount?: number;
  installs?: number;
  clicks?: number;
  featured?: boolean;
  developer?: {
    name?: string;
    wallet?: string;
    verified?: boolean;
  };
  verified?: boolean;
  topBaseRank?: number | null;
  autoUpdated?: boolean;
  rank?: number; // Overall app rank
  variant?: "horizontal" | "grid" | "featured";
  url?: string; // Main app URL
  farcasterUrl?: string; // Farcaster mini app URL
  baseMiniAppUrl?: string; // Base mini app URL
  tags?: string[]; // App tags for display
  hideSaveButton?: boolean; // Hide the save/favorite button
}

const AppCard = ({
  id,
  name,
  description,
  iconUrl,
  category,
  ratingAverage = 0,
  ratingCount = 0,
  installs = 0,
  featured,
  developer,
  verified = false,
  topBaseRank = null,
  autoUpdated = false,
  rank,
  variant = "horizontal",
  url,
  farcasterUrl,
  baseMiniAppUrl,
  tags = [],
  hideSaveButton = false,
}: AppCardProps) => {
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
    const checkMobile = () => {
      if (typeof window !== "undefined") {
        setIsMobile(window.innerWidth < 768);
      }
    };
    checkMobile();
    if (typeof window !== "undefined") {
      window.addEventListener("resize", checkMobile);
      return () => window.removeEventListener("resize", checkMobile);
    }
  }, []);

  if (!id) {
    return null;
  }

  const handleCardClick = useCallback(() => {
    router.push(`/apps/${id}`);
  }, [router, id]);

  // Mobile horizontal card (default) - Compact Play Store style
  if (variant === "horizontal") {
    // Format tags for display (e.g., "NFT • Blindbox • Base • Warplets")
    const formattedTags = tags && tags.length > 0 
      ? tags.slice(0, 4).map(tag => tag.charAt(0).toUpperCase() + tag.slice(1)).join(" • ")
      : category;

    return (
      <div className="block w-full">
        <motion.div
          whileTap={isMobile ? {} : { scale: 0.98 }}
          transition={{ duration: 0.1 }}
        >
          <div 
            className="flex items-center justify-between p-3 rounded-2xl bg-[#10131B] border border-[#1A1F2E] hover:border-[#2A2F3E] transition-all duration-100 cursor-pointer touch-manipulation"
            onClick={handleCardClick}
            style={{ WebkitTapHighlightColor: 'transparent', maxHeight: '130px' }}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {/* App Icon - 52px */}
              {iconUrl && (
                <div className="flex-shrink-0">
                  <Image
                    src={iconUrl ? optimizeDevImage(iconUrl) : `/api/icon?id=${id}`}
                    alt={name}
                    width={52}
                    height={52}
                    className="w-[52px] h-[52px] rounded-xl object-cover bg-background-secondary"
                    loading={featured ? "eager" : "lazy"}
                    fetchPriority={featured ? "high" : "auto"}
                    priority={featured}
                    quality={70}
                    sizes="52px"
                    placeholder="blur"
                    blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTIiIGhlaWdodD0iNTIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjUyIiBoZWlnaHQ9IjUyIiBmaWxsPSIjMTAxMzFCIi8+PC9zdmc+"
                    unoptimized={needsUnoptimized(iconUrl ? optimizeDevImage(iconUrl) : `/api/icon?id=${id}`)}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      const originalSrc = iconUrl ? optimizeDevImage(iconUrl) : `/api/icon?id=${id}`;
                      console.error(`[AppCard] Image failed to load:`, {
                        originalUrl: iconUrl,
                        optimizedUrl: originalSrc,
                        currentSrc: target.src,
                        appId: id,
                        appName: name,
                        isApiRoute: needsUnoptimized(originalSrc),
                      });
                      target.src = '/placeholder.svg';
                    }}
                  />
                </div>
              )}

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
                  {ratingCount > 0 && ratingAverage > 0 ? (
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      <span className="text-yellow-400 text-[12px]">
                        {ratingAverage % 1 === 0 ? ratingAverage.toString() : ratingAverage.toFixed(1)}
                      </span>
                    </div>
                  ) : null}
                </div>

                {/* Tags Row */}
                {formattedTags && (
                  <p className="text-[11px] text-gray-400 whitespace-nowrap overflow-hidden text-ellipsis">
                    {formattedTags}
                  </p>
                )}

                {/* Description Row */}
                <p className="text-xs text-gray-400 overflow-hidden text-ellipsis whitespace-nowrap">
                  {description}
                </p>
              </div>
            </div>

            {/* Right Side: Save Icon + Open Button */}
            <div className="flex flex-col items-end gap-2 ml-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
              {/* Save button - Top right */}
              {!hideSaveButton && (
                <div className="z-10">
                  <FavoriteButton appId={id} size="sm" />
                </div>
              )}
              
              {/* Open button - Right center */}
              <Link
                href={`/apps/${id}`}
                className="px-3 py-1.5 bg-[#0052FF] hover:bg-[#0040CC] text-white text-sm rounded-xl font-medium flex items-center gap-1 transition-colors z-10"
                onClick={(e) => e.stopPropagation()}
                title="View app details"
              >
                <ExternalLink className="w-3 h-3" />
                View
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Featured card (larger)
  if (variant === "featured") {
    return (
      <div className="block">
        <motion.div
          whileTap={isMobile ? {} : { scale: 0.98 }}
          transition={{ duration: 0.1 }}
        >
          <Card 
            className="bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 hover:border-white/20 hover-glow transition-all duration-100 overflow-hidden cursor-pointer touch-manipulation"
            style={{ WebkitTapHighlightColor: 'transparent' }}
            onClick={handleCardClick}
          >
            <CardContent className="p-0">
              <div className="relative">
                {/* Hero Image/Icon Section */}
                {iconUrl && (
                  <div className="w-full h-40 bg-gradient-to-br from-base-blue/30 via-base-cyan/20 to-purple-500/20 flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F19] via-transparent to-transparent z-10" />
                    <Image
                      src={iconUrl ? optimizeDevImage(iconUrl) : `/api/icon?id=${id}`}
                      alt={name}
                      width={100}
                      height={100}
                      className="w-24 h-24 rounded-2xl shadow-2xl z-20 relative"
                      loading="eager"
                      fetchPriority="high"
                      priority
                      quality={70}
                      sizes="96px"
                      placeholder="blur"
                      blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzEyMTIxMiIvPjwvc3ZnPg=="
                      unoptimized={needsUnoptimized(iconUrl ? optimizeDevImage(iconUrl) : `/api/icon?id=${id}`)}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        const originalSrc = iconUrl ? optimizeDevImage(iconUrl) : `/api/icon?id=${id}`;
                        console.error(`[AppCard] Featured image failed to load:`, {
                          originalUrl: iconUrl,
                          optimizedUrl: originalSrc,
                          currentSrc: target.src,
                          appId: id,
                          appName: name,
                          isApiRoute: needsUnoptimized(originalSrc),
                        });
                        target.src = "/placeholder.svg";
                      }}
                    />
                  </div>
                )}
                
                {/* Content Section */}
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <div className="flex items-center gap-1">
                          <h3 className="font-bold text-xl truncate">{name}</h3>
                          {verified ? (
                            <Image
                              src="/verify.svg"
                              alt="Verified"
                              width={20}
                              height={20}
                              className="w-5 h-5 flex-shrink-0 ml-0.5"
                              title="Verified App"
                              loading="lazy"
                            />
                          ) : (
                            <UnverifiedBadge iconOnly size="sm" className="flex-shrink-0 ml-0.5" />
                          )}
                        </div>
                        {rank && (
                          <RankBadge rank={rank} size="md" className="flex-shrink-0" />
                        )}
                        {topBaseRank && (
                          <Top30Badge rank={topBaseRank} className="flex-shrink-0" />
                        )}
                        {autoUpdated && (
                          <AutoUpdateBadge className="flex-shrink-0" />
                        )}
                      </div>
                      {developer && (
                        <div className="flex items-center gap-1.5 mb-2">
                          <p className="text-sm text-muted-foreground">
                            by {(developer.name === "System" ? "Mini Cast Admin" : developer.name) || "Anonymous Developer"}
                          </p>
                          {developer.verified && (
                            <VerifiedBadge type="developer" iconOnly size="sm" />
                          )}
                        </div>
                      )}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs bg-base-blue/20 text-base-blue px-2 py-1 rounded-full">
                          {category}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Description */}
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-3 leading-relaxed">
                    {description}
                  </p>
                  
                  {/* Stats and CTA */}
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="flex items-center gap-1">
                        <RatingStars rating={ratingAverage} ratingCount={ratingCount} size={14} showNumber />
                        {ratingCount > 0 && (
                          <span className="text-xs text-muted-foreground ml-1">
                            ({ratingCount})
                          </span>
                        )}
                        {ratingCount === 0 && (
                          <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full text-[10px] font-medium border border-green-500/30 ml-2">
                            New
                          </span>
                        )}
                      </div>
                      {installs > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {installs.toLocaleString()} installs
                        </span>
                      )}
                    </div>
                    <Link
                      href={`/apps/${id}`}
                      className="bg-base-blue hover:bg-base-blue/90 text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition-colors flex-shrink-0"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open
                    </Link>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Grid card (desktop)
  return (
    <div className="block">
      <motion.div
        whileHover={isMobile ? {} : { scale: 1.02 }}
        whileTap={isMobile ? {} : { scale: 0.98 }}
        transition={{ duration: 0.1 }}
      >
        <Card 
            className="bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 hover:border-white/20 hover-glow transition-all duration-100 h-full cursor-pointer touch-manipulation"
            style={{ WebkitTapHighlightColor: 'transparent' }}
            onClick={handleCardClick}
          >
          <CardContent className="p-4">
            <div className="flex flex-col items-center text-center mb-4">
              {iconUrl && (
                <Image
                  src={iconUrl ? optimizeDevImage(iconUrl) : `/api/icon?id=${id}`}
                  alt={name}
                  width={80}
                  height={80}
                  className="w-20 h-20 rounded-xl bg-background-secondary p-2 shadow-lg mb-3"
                  quality={70}
                  loading="lazy"
                  sizes="80px"
                  placeholder="blur"
                  blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjMTIxMjEyIi8+PC9zdmc+"
                  unoptimized={needsUnoptimized(iconUrl ? optimizeDevImage(iconUrl) : `/api/icon?id=${id}`)}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    const originalSrc = iconUrl ? optimizeDevImage(iconUrl) : `/api/icon?id=${id}`;
                    console.error(`[AppCard] Grid image failed to load:`, {
                      originalUrl: iconUrl,
                      optimizedUrl: originalSrc,
                      currentSrc: target.src,
                      appId: id,
                      appName: name,
                      isApiRoute: needsUnoptimized(originalSrc),
                    });
                    target.src = "/placeholder.svg";
                  }}
                />
              )}
              <div className="flex items-center gap-2 mb-1 flex-wrap justify-center">
                <div className="flex items-center gap-1">
                  <h3 className="font-semibold text-base">{name}</h3>
                  {verified ? (
                    <Image
                      src="/verify.svg"
                      alt="Verified"
                      width={18}
                      height={18}
                      className="w-[18px] h-[18px] flex-shrink-0 ml-0.5"
                      title="Verified App"
                      loading="lazy"
                    />
                  ) : (
                    <UnverifiedBadge iconOnly size="sm" className="flex-shrink-0 ml-0.5" />
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-2">{category}</p>
            </div>

            <p className="text-sm text-muted-foreground mb-4 line-clamp-2 text-center">
              {description}
            </p>

            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <RatingStars rating={ratingAverage} ratingCount={ratingCount} size={12} />
              {ratingCount === 0 && (
                <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full text-[10px] font-medium border border-green-500/30 ml-2">
                  New
                </span>
              )}
              {installs > 0 && (
                <span>{installs} installs</span>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default AppCard;
