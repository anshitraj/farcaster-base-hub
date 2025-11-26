"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Star, Play } from "lucide-react";
import RatingStars from "./RatingStars";
import PremiumBadge from "./PremiumBadge";
import PremiumLockedOverlay from "./PremiumLockedOverlay";

interface PremiumCardProps {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  category: string;
  ratingAverage?: number;
  ratingCount?: number;
  installs?: number;
  isLocked?: boolean;
  onSubscribe?: () => void;
}

export default function PremiumCard({
  id,
  name,
  description,
  iconUrl,
  category,
  ratingAverage = 0,
  ratingCount = 0,
  installs = 0,
  isLocked = false,
  onSubscribe,
}: PremiumCardProps) {
  const cardContent = (
    <Card className="glass-card hover:bg-white/10 transition-all duration-300 h-full relative overflow-hidden border-purple-500/20">
      <CardContent className="p-0">
        <div className="relative">
          {/* Hero Image/Icon Section */}
          {iconUrl && (
            <div className="w-full h-40 bg-gradient-to-br from-purple-600/30 via-base-blue/20 to-purple-500/20 flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F19] via-transparent to-transparent z-10" />
              <Image
                src={iconUrl}
                alt={name}
                width={100}
                height={100}
                className="w-24 h-24 rounded-2xl shadow-2xl z-20 relative"
                loading="lazy"
              />
              {isLocked && (
                <div className="absolute top-2 right-2 z-30">
                  <PremiumBadge size="sm" />
                </div>
              )}
            </div>
          )}
          
          {/* Content Section */}
          <div className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <h3 className="font-bold text-xl truncate">{name}</h3>
                  {!isLocked && <PremiumBadge size="sm" />}
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs bg-purple-600/20 text-purple-300 px-2 py-1 rounded-full">
                    {category}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Description */}
            <p className="text-sm text-muted-foreground mb-4 line-clamp-2 leading-relaxed">
              {description}
            </p>
            
            {/* Stats and CTA */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-1">
                  <RatingStars rating={ratingAverage} size={14} showNumber />
                  {ratingCount > 0 && (
                    <span className="text-xs text-muted-foreground ml-1">
                      ({ratingCount})
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {installs > 0 ? `${installs.toLocaleString()} installs` : "New"}
                </span>
              </div>
              <div className="bg-gradient-to-r from-purple-600 to-base-blue hover:from-purple-700 hover:to-base-blue/90 text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition-colors flex-shrink-0">
                <Play className="w-4 h-4" />
                Play
              </div>
            </div>
          </div>
        </div>
      </CardContent>
      {isLocked && <PremiumLockedOverlay onSubscribe={onSubscribe} />}
    </Card>
  );

  if (isLocked) {
    return (
      <div className="block min-w-[340px] max-w-[380px] relative">
        {cardContent}
      </div>
    );
  }

  return (
    <Link href={`/apps/${id}`} className="block min-w-[340px] max-w-[380px]">
      <motion.div
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.2 }}
      >
        {cardContent}
      </motion.div>
    </Link>
  );
}

