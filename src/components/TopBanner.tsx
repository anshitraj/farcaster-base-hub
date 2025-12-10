"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Play, Star, ChevronLeft, ChevronRight } from "lucide-react";
import FavoriteButton from "./FavoriteButton";
import { shortenDescription } from "@/lib/description-utils";
import RatingStars from "./RatingStars";
import { optimizeDevImage, optimizeBannerImage, needsUnoptimized } from "@/utils/optimizeDevImage";

interface TopBannerProps {
  apps: {
    id: string;
    name: string;
    description?: string;
    iconUrl: string;
    headerImageUrl?: string; // Header/OG image URL
    category?: string;
    tags?: string[]; // App tags
    verified?: boolean; // App verification status
    developer?: {
      verified?: boolean;
    };
    ratingAverage?: number;
    ratingCount?: number;
    installs?: number;
    url?: string; // Main app URL
    farcasterUrl?: string; // Farcaster mini app URL
    baseMiniAppUrl?: string; // Base mini app URL
  }[];
}

export default function TopBanner({ apps }: TopBannerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [preloadedImages, setPreloadedImages] = useState<Set<number>>(new Set([0]));

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Preload first slide images immediately for LCP optimization
  useEffect(() => {
    if (typeof window === "undefined" || apps.length === 0) return;

    // Preload first slide images immediately (LCP optimization)
    const firstApp = apps[0];
    if (firstApp) {
      // Preload first banner image (LCP element)
      if (firstApp.headerImageUrl) {
        const optimizedUrl = optimizeBannerImage(firstApp.headerImageUrl);
        const link = document.createElement("link");
        link.rel = "preload";
        link.as = "image";
        link.href = optimizedUrl;
        link.fetchPriority = "high";
        document.head.appendChild(link);
      }
      
      // Preload first icon
      if (firstApp.iconUrl) {
        const optimizedUrl = optimizeDevImage(firstApp.iconUrl);
        const link = document.createElement("link");
        link.rel = "preload";
        link.as = "image";
        link.href = optimizedUrl;
        link.fetchPriority = "high";
        document.head.appendChild(link);
      }
    }
  }, [apps]); // Only run once when apps are loaded

  // Preload next slide for smoother transitions
  useEffect(() => {
    if (typeof window === "undefined" || apps.length === 0) return;

    // Only preload next slide (not current, already loaded)
    const nextIndex = (currentIndex + 1) % apps.length;
    if (nextIndex === 0) return; // Already preloaded first slide
    
    const app = apps[nextIndex];
    if (!app) return;
    
    // Preload next banner image
    if (app.headerImageUrl) {
      const optimizedUrl = optimizeBannerImage(app.headerImageUrl);
      const img = new window.Image();
      img.src = optimizedUrl;
    }
    
    // Preload next icon
    if (app.iconUrl) {
      const optimizedUrl = optimizeDevImage(app.iconUrl);
      const img = new window.Image();
      img.src = optimizedUrl;
    }
  }, [apps, currentIndex]);


  // Auto-slide every 5 seconds
  useEffect(() => {
    if (!isAutoPlaying || apps.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % apps.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, apps.length]);

  if (!apps || apps.length === 0) return null;

  const currentApp = apps[currentIndex];

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + apps.length) % apps.length);
    setIsAutoPlaying(false);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % apps.length);
    setIsAutoPlaying(false);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    setIsAutoPlaying(false);
  };

  // Swipe handlers for mobile
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe || isRightSwipe) {
      e.preventDefault();
      e.stopPropagation();
      if (isLeftSwipe) {
        goToNext();
      } else {
        goToPrevious();
      }
    }
  };


  return (
    <div className="relative mb-6 md:mb-8 group">
      <Link
        href={`/apps/${currentApp.id}`}
        className="block"
      >
        <div
          key={currentIndex}
          className="relative h-[200px] sm:h-[220px] md:h-[320px] lg:h-[400px] rounded-3xl overflow-hidden backdrop-blur-[2px] bg-white/2 shadow-xl cursor-pointer"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* Subtle diagonal gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#11131A] to-[#080A0F] opacity-60 z-0" />
          
          {/* Header Image or Gradient Background */}
          {currentApp.headerImageUrl ? (
            <>
              <Image
                src={optimizeBannerImage(currentApp.headerImageUrl)}
                alt={currentApp.name}
                fill
                className="object-cover object-center z-0"
                unoptimized={needsUnoptimized(optimizeBannerImage(currentApp.headerImageUrl))}
                priority={currentIndex === 0}
                quality={currentIndex === 0 ? 90 : 75} // Higher quality for first slide (LCP)
                loading={currentIndex === 0 ? "eager" : "lazy"}
                fetchPriority={currentIndex === 0 ? "high" : "auto"}
                sizes="100vw"
                decoding={currentIndex === 0 ? "sync" : "async"} // Sync decoding for LCP
                data-original={currentApp.headerImageUrl}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  const originalUrl = target.getAttribute("data-original");
                  if (originalUrl) {
                    target.src = originalUrl;
                  } else {
                    target.src = "/placeholder.svg";
                  }
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20 z-[1]" />
            </>
          ) : (
            <>
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-pink-500 to-purple-700 opacity-90 z-0" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent z-[1]" />
            </>
          )}
          
          {/* Content */}
          <div className="relative p-4 sm:p-6 md:p-8 lg:p-12 z-10 h-full flex items-start sm:items-center justify-center overflow-visible">
            <div className="flex flex-col sm:flex-row items-start sm:items-start gap-3 sm:gap-4 md:gap-6 lg:gap-8 w-full min-w-0 h-full">
              {/* App Icon - Smaller on mobile */}
              <div
                className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-32 lg:h-32 rounded-2xl sm:rounded-3xl bg-white/20 backdrop-blur-md p-2 sm:p-3 md:p-4 shadow-2xl border border-white/30 flex-shrink-0 self-start sm:self-start"
              >
                {currentApp.iconUrl ? (
                  <Image
                    src={optimizeDevImage(currentApp.iconUrl)}
                    alt={currentApp.name}
                    priority={currentIndex === 0}
                    loading={currentIndex === 0 ? "eager" : "lazy"}
                    fetchPriority={currentIndex === 0 ? "high" : "auto"}
                    width={128}
                    height={128}
                    className="w-full h-full object-contain rounded-xl sm:rounded-2xl"
                    quality={currentIndex === 0 ? 90 : 75} // Higher quality for first slide
                    decoding={currentIndex === 0 ? "sync" : "async"} // Sync decoding for LCP
                    sizes="(max-width: 768px) 64px, (max-width: 1024px) 96px, 128px"
                    data-original={currentApp.iconUrl}
                    unoptimized={needsUnoptimized(optimizeDevImage(currentApp.iconUrl))}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      const originalUrl = target.getAttribute("data-original");
                      if (originalUrl) {
                        target.src = originalUrl;
                      } else {
                        target.src = "/placeholder.svg";
                      }
                    }}
                    onLoad={() => {
                      // Image loaded successfully
                    }}
                  />
                ) : (
                  <div className="w-full h-full rounded-2xl bg-white/20 flex items-center justify-center">
                    <span className="text-4xl font-bold text-white">
                      {currentApp.name.charAt(0)}
                    </span>
                  </div>
                )}
              </div>

              {/* App Info */}
              <div className="flex-1 min-w-0 overflow-visible w-full flex flex-col justify-start h-full relative">
                <div className="flex-1 min-w-0 overflow-visible pb-16 sm:pb-20">
                  <div
                    className="flex items-center gap-1.5 sm:gap-2 mb-2 min-w-0"
                  >
                    <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold text-white drop-shadow-lg leading-tight truncate min-w-0 text-left">
                      {currentApp.name}
                    </h1>
                    {currentApp.verified ? (
                      <Image
                        src="/verify.svg"
                        alt="Verified"
                        width={28}
                        height={28}
                        className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 flex-shrink-0"
                        title="Verified App"
                        quality={90}
                        priority={currentIndex === 0}
                      />
                    ) : (
                      <Image
                        src="/Warning.svg"
                        alt="Unverified"
                        width={28}
                        height={28}
                        className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 flex-shrink-0"
                        title="Unverified App"
                        quality={90}
                        priority={currentIndex === 0}
                      />
                    )}
                  </div>
                  {/* Category tags, Verified Developer badge, and Rating */}
                  <div
                    className="flex items-center gap-1.5 sm:gap-2 mb-2 overflow-visible min-w-0 flex-wrap"
                  >
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                      {currentApp.category && (
                        <span className="text-[10px] sm:text-xs md:text-sm text-white/70 font-medium truncate whitespace-nowrap">
                          {currentApp.category}
                        </span>
                      )}
                      {currentApp.tags && currentApp.tags.length > 0 && (
                        <>
                          {currentApp.category && (
                            <span className="text-white/40 flex-shrink-0">•</span>
                          )}
                          <span className="text-[10px] sm:text-xs md:text-sm text-white/70 font-medium truncate whitespace-nowrap">
                            {currentApp.tags.slice(0, 2).join(" • ")}
                          </span>
                        </>
                      )}
                      {currentApp.developer?.verified && (
                        <>
                          {(currentApp.category || (currentApp.tags && currentApp.tags.length > 0)) && (
                            <span className="text-white/40 flex-shrink-0">|</span>
                          )}
                          <span className="text-[10px] sm:text-xs md:text-sm text-green-400 font-medium flex items-center gap-1 flex-shrink-0 whitespace-nowrap">
                            <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-green-400"></span>
                            <span className="hidden sm:inline">Verified Developer</span>
                            <span className="sm:hidden">Verified</span>
                          </span>
                        </>
                      )}
                    </div>
                    {/* Rating - Right after Verified */}
                    <div
                      className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0"
                    >
                      <RatingStars
                        rating={currentApp.ratingAverage || 0}
                        ratingCount={currentApp.ratingCount || 0}
                        size={14}
                        showNumber
                        className="text-white"
                      />
                      {currentApp.ratingCount && currentApp.ratingCount > 0 && (
                        <span className="text-white/80 text-xs sm:text-sm">
                          ({currentApp.ratingCount})
                        </span>
                      )}
                    </div>
                  </div>
                  {currentApp.description && (
                    <p
                      className="text-xs sm:text-sm md:text-base lg:text-lg text-white/90 leading-snug drop-shadow-md overflow-visible min-w-0 text-left mb-1"
                      style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        textOverflow: 'ellipsis',
                        overflow: 'hidden',
                      }}
                    >
                      {shortenDescription(currentApp.description)}
                    </p>
                  )}
                </div>

              </div>
            </div>
          </div>

          {/* Save Button - Top Right */}
          <div className="absolute top-4 right-4 z-30" onClick={(e) => e.stopPropagation()}>
            <FavoriteButton appId={currentApp.id} size="sm" className="bg-white/20 backdrop-blur-md rounded-full p-2 sm:p-3 flex-shrink-0" />
          </div>

          {/* Decorative elements */}
          <div className="absolute top-8 right-8 opacity-20 z-0">
            <div className="w-32 h-32 rounded-full bg-white/10 blur-3xl" />
          </div>
        </div>
      </Link>

      {/* Navigation Arrows - Only show on desktop */}
      {apps.length > 1 && !isMobile && (
        <>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              goToPrevious();
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-black/50 hover:bg-black/70 active:bg-black/80 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all duration-100 opacity-0 group-hover:opacity-100 touch-manipulation"
            aria-label="Previous app"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              goToNext();
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-black/50 hover:bg-black/70 active:bg-black/80 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all duration-100 opacity-0 group-hover:opacity-100 touch-manipulation"
            aria-label="Next app"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Dots Indicator */}
      {apps.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-2">
          {apps.map((_, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                goToSlide(index);
              }}
              className={`w-2 h-2 rounded-full transition-all duration-100 ${
                index === currentIndex
                  ? "bg-white w-8"
                  : "bg-white/50 hover:bg-white/75 active:bg-white/90"
              } touch-manipulation`}
              style={{ WebkitTapHighlightColor: 'transparent' }}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
