"use client";

import Link from "next/link";
import Image from "next/image";
import { Star, Users, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import RatingStars from "./RatingStars";
import VerifiedBadge from "./VerifiedBadge";
import Top30Badge from "./Top30Badge";
import AutoUpdateBadge from "./AutoUpdateBadge";
import RankBadge from "./RankBadge";

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
}: AppCardProps) => {
  if (!id) {
    return null;
  }

  // Mobile horizontal card (default)
  if (variant === "horizontal") {
    return (
      <Link href={`/apps/${id}`} className="block min-w-[280px]">
        <motion.div
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.2 }}
        >
          <Card className="card-surface hover-glow transition-all duration-300 h-full border-[hsl(var(--border))]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                {/* Icon */}
                {iconUrl && (
                  <div className="flex-shrink-0">
                    <Image
                      src={iconUrl}
                      alt={name}
                      width={64}
                      height={64}
                      className="w-16 h-16 rounded-xl bg-background-secondary p-2 shadow-lg"
                      loading="lazy"
                      placeholder="blur"
                      blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjMTExODI3Ii8+PC9zdmc+"
                    />
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-semibold text-base truncate">
                      {name}
                    </h3>
                    {rank && (
                      <RankBadge rank={rank} size="sm" className="flex-shrink-0" />
                    )}
                    {verified && (
                      <VerifiedBadge type="app" className="flex-shrink-0" />
                    )}
                    {topBaseRank && (
                      <Top30Badge rank={topBaseRank} className="flex-shrink-0 text-[10px]" />
                    )}
                    {autoUpdated && (
                      <AutoUpdateBadge className="flex-shrink-0 text-[10px]" />
                    )}
                  </div>
                  {developer && (
                    <div className="flex items-center gap-1.5 mb-1">
                      <p className="text-xs text-muted-foreground">
                        {developer.name || "Anonymous Developer"}
                      </p>
                      {developer.verified && (
                        <VerifiedBadge type="developer" iconOnly size="sm" />
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-3 mt-2">
                    <RatingStars rating={ratingAverage} ratingCount={ratingCount} size={12} showNumber />
                    {ratingCount === 0 && (
                      <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full text-[10px] font-medium border border-green-500/30">
                        New
                      </span>
                    )}
                    {ratingCount > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {installs > 0 ? `${installs.toLocaleString()}` : ""}
                      </span>
                    )}
                  </div>
                </div>

                {/* Open Button */}
                <div className="flex-shrink-0">
                  <div className="bg-base-blue/20 hover:bg-base-blue/30 text-base-blue px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1 transition-all hover:glow-base-blue border border-base-blue/30">
                    <ExternalLink className="w-3 h-3" />
                    Open
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </Link>
    );
  }

  // Featured card (larger)
  if (variant === "featured") {
    return (
      <Link href={`/apps/${id}`} className="block">
        <motion.div
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.2 }}
        >
          <Card className="card-surface hover-glow transition-all duration-300 overflow-hidden border-base-blue/30">
            <CardContent className="p-0">
              <div className="relative">
                {/* Hero Image/Icon Section */}
                {iconUrl && (
                  <div className="w-full h-40 bg-gradient-to-br from-base-blue/30 via-base-cyan/20 to-purple-500/20 flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F19] via-transparent to-transparent z-10" />
                    <Image
                      src={iconUrl}
                      alt={name}
                      width={100}
                      height={100}
                      className="w-24 h-24 rounded-2xl shadow-2xl z-20 relative"
                      loading="lazy"
                    />
                  </div>
                )}
                
                {/* Content Section */}
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="font-bold text-xl truncate">{name}</h3>
                        {rank && (
                          <RankBadge rank={rank} size="md" className="flex-shrink-0" />
                        )}
                        {verified && (
                          <VerifiedBadge type="app" className="flex-shrink-0" />
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
                            by {developer.name || "Anonymous Developer"}
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
                      {ratingCount > 0 && installs > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {installs.toLocaleString()} installs
                        </span>
                      )}
                    </div>
                    <div className="bg-base-blue hover:bg-base-blue/90 text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition-colors flex-shrink-0">
                      <ExternalLink className="w-4 h-4" />
                      Open
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </Link>
    );
  }

  // Grid card (desktop)
  return (
    <Link href={`/apps/${id}`} className="block">
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.2 }}
      >
          <Card className="card-surface hover-glow transition-all duration-300 h-full border-[hsl(var(--border))]">
          <CardContent className="p-4">
            <div className="flex flex-col items-center text-center mb-4">
              {iconUrl && (
                <Image
                  src={iconUrl}
                  alt={name}
                  width={80}
                  height={80}
                  className="w-20 h-20 rounded-xl bg-background-secondary p-2 shadow-lg mb-3"
                />
              )}
              <div className="flex items-center gap-2 mb-1 flex-wrap justify-center">
                <h3 className="font-semibold text-base">{name}</h3>
                {verified && <VerifiedBadge type="app" className="text-[10px]" />}
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
              <span>{installs} installs</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </Link>
  );
};

export default AppCard;
