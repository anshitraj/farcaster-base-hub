"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { optimizeDevImage } from "@/utils/optimizeDevImage";
import { motion } from "framer-motion";

type CategoryHighlightCardProps = {
  title: string;          // Game, Music, Social...
  featuredApp: string;    // Apple Run, Spotify...
  ctaLabel?: string;      // Open, Install...
  gradientFrom: string;
  gradientTo: string;
  href?: string;
  backgroundImage?: string; // Path to background image (e.g., "/category-bg/game-bg.jpg")
};

export function CategoryHighlightCard({
  title,
  featuredApp,
  ctaLabel = "Open",
  gradientFrom,
  gradientTo,
  href,
  backgroundImage,
}: CategoryHighlightCardProps) {
  const [categoryApps, setCategoryApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch apps for this category
  useEffect(() => {
    async function fetchCategoryApps() {
      if (!href) return;
      
      try {
        const url = new URL(href, window.location.origin);
        const category = url.searchParams.get("category");
        const tag = url.searchParams.get("tag");
        
        const params = new URLSearchParams();
        if (category) params.set("category", category);
        if (tag) params.set("tag", tag);
        params.set("limit", "8"); // Get up to 8 apps for icons
        
        const res = await fetch(`/api/apps?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setCategoryApps(data.apps || []);
        }
      } catch (error) {
        console.error("Error fetching category apps:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchCategoryApps();
  }, [href]);

  // Get featured app (first app or use provided name)
  const featuredAppData = categoryApps.find(app => 
    app.name.toLowerCase().includes(featuredApp.toLowerCase())
  ) || categoryApps[0];
  
  const appIcons = categoryApps.slice(0, 5); // Show max 5 icons with names

  const content = (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ duration: 0.3 }}
      className="relative h-[320px] md:h-[360px] w-full rounded-[24px] overflow-hidden cursor-pointer shadow-lg hover:shadow-xl transition-all duration-300"
    >
      {/* Background Image or Gradient */}
      {backgroundImage ? (
        <>
          <div className="absolute inset-0">
            <Image
              src={backgroundImage}
              alt={title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              quality={75}
              priority={false}
              loading="lazy"
            />
          </div>
          {/* Dark overlay for text readability */}
          <div className="absolute inset-0 bg-black/50 group-hover:bg-black/45 transition-colors duration-300" />
        </>
      ) : (
        <>
          {/* Gradient background */}
          <div
            className={`absolute inset-0 bg-gradient-to-br ${gradientFrom} ${gradientTo}`}
          />
          {/* Subtle dark overlay for text readability */}
          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/25 transition-colors duration-300" />
        </>
      )}

      {/* Content */}
      <div className="relative h-full flex flex-col p-5">
        {/* Category Title - Top Left */}
        <h3 className="text-2xl md:text-3xl font-bold text-white mb-3 drop-shadow-lg">
          {title}
        </h3>

        {/* App Icons Row with Names - Centered */}
        <div className="flex-1 flex items-center justify-center mb-4">
          {loading ? (
            <div className="flex gap-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 animate-pulse" />
                  <div className="w-12 h-3 rounded bg-white/20 animate-pulse" />
                </div>
              ))}
            </div>
          ) : appIcons.length > 0 ? (
            <div className="flex items-center justify-center gap-2.5 flex-wrap">
              {appIcons.map((app) => (
                <div
                  key={app.id}
                  className="flex flex-col items-center gap-1.5 flex-shrink-0"
                >
                  {/* App Icon */}
                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 overflow-hidden shadow-md hover:scale-105 transition-transform duration-200">
                    {app.iconUrl ? (
                      <Image
                        src={optimizeDevImage(app.iconUrl)}
                        data-original={app.iconUrl}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          const originalUrl = target.getAttribute("data-original");
                          if (originalUrl) {
                            target.src = originalUrl;
                          } else {
                            target.src = "/placeholder.svg";
                          }
                        }}
                        alt={app.name}
                        width={56}
                        height={56}
                        className="w-full h-full object-cover"
                        quality={75}
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-white/5">
                        <div className="w-8 h-8 rounded-lg bg-white/20" />
                      </div>
                    )}
                  </div>
                  {/* App Name */}
                  <p className="text-white text-xs font-medium text-center max-w-[50px] md:max-w-[60px] truncate drop-shadow-lg">
                    {app.name}
                  </p>
                </div>
              ))}
              {/* Show More Button */}
              {categoryApps.length > 5 && href && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    window.location.href = href;
                  }}
                  className="flex flex-col items-center gap-1.5 flex-shrink-0 group"
                >
                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-white/20 backdrop-blur-sm border-2 border-white/30 border-dashed overflow-hidden shadow-md hover:scale-105 hover:bg-white/30 transition-all duration-200 flex items-center justify-center">
                    <span className="text-white text-lg font-bold group-hover:scale-110 transition-transform">+</span>
                  </div>
                  <p className="text-white text-xs font-medium text-center max-w-[50px] md:max-w-[60px] truncate drop-shadow-lg">
                    Show more
                  </p>
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <div className="flex flex-col items-center gap-1.5">
                <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                  <div className="w-10 h-10 rounded-lg bg-white/20" />
                </div>
                <p className="text-white text-xs font-medium drop-shadow-lg">
                  No apps
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer - App Name + Open Button */}
        <div className="flex items-center justify-between mt-auto">
          <div className="flex-1 min-w-0">
            <p className="text-white text-base md:text-lg font-semibold truncate drop-shadow-lg">
              {featuredAppData?.name || featuredApp}
            </p>
          </div>
          <button
            onClick={(e) => {
              e.preventDefault();
              if (featuredAppData) {
                window.location.href = `/apps/${featuredAppData.id}`;
              } else if (href) {
                window.location.href = href;
              }
            }}
            className="ml-3 px-5 py-2 bg-white text-black rounded-full text-sm font-semibold hover:bg-white/90 transition-colors duration-200 shadow-md flex-shrink-0"
          >
            {ctaLabel}
          </button>
        </div>
      </div>
    </motion.div>
  );

  if (href) {
    return (
      <Link href={href} className="block group">
        {content}
      </Link>
    );
  }

  return content;
}
