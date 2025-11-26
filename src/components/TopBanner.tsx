"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Star, ChevronLeft, ChevronRight } from "lucide-react";
import FavoriteButton from "./FavoriteButton";
import { shortenDescription } from "@/lib/description-utils";

interface TopBannerProps {
  apps: {
    id: string;
    name: string;
    description?: string;
    iconUrl: string;
    category?: string;
    ratingAverage?: number;
    installs?: number;
  }[];
}

export default function TopBanner({ apps }: TopBannerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

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

  return (
    <div className="relative mb-8 group">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.5 }}
          className="relative rounded-3xl overflow-hidden"
        >
          {/* Gradient Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-pink-500 to-purple-700 opacity-90" />
          
          {/* Animated overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          
          {/* Content */}
          <div className="relative p-8 md:p-12 lg:p-16">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-8">
              {/* App Icon */}
              <motion.div
                key={`icon-${currentIndex}`}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
                whileHover={{ rotate: [0, -5, 5, -5, 0], scale: 1.1 }}
                className="w-24 h-24 md:w-32 md:h-32 rounded-3xl bg-white/20 backdrop-blur-md p-4 shadow-2xl border border-white/30 flex-shrink-0"
              >
                {currentApp.iconUrl ? (
                  <img
                    src={currentApp.iconUrl}
                    alt={currentApp.name}
                    className="w-full h-full object-contain rounded-2xl"
                  />
                ) : (
                  <div className="w-full h-full rounded-2xl bg-white/20 flex items-center justify-center">
                    <span className="text-4xl font-bold text-white">
                      {currentApp.name.charAt(0)}
                    </span>
                  </div>
                )}
              </motion.div>

              {/* App Info */}
              <div className="flex-1">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <motion.h1
                      key={`title-${currentIndex}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 }}
                      className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-white mb-3 drop-shadow-lg"
                    >
                      {currentApp.name}
                    </motion.h1>
                    {currentApp.description && (
                      <motion.p
                        key={`desc-${currentIndex}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-base md:text-lg text-white/90 max-w-2xl leading-relaxed drop-shadow-md"
                      >
                        {shortenDescription(currentApp.description)}
                      </motion.p>
                    )}
                  </div>
                  <FavoriteButton appId={currentApp.id} size="lg" className="bg-white/20 backdrop-blur-md rounded-full p-3 flex-shrink-0" />
                </div>

                {/* Stats and Button */}
                <motion.div
                  key={`stats-${currentIndex}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex items-center gap-6 flex-wrap"
                >
                  {currentApp.ratingAverage && currentApp.ratingAverage > 0 && (
                    <div className="flex items-center gap-2">
                      <Star className="w-5 h-5 text-yellow-300 fill-yellow-300" />
                      <span className="text-white font-semibold">
                        {currentApp.ratingAverage.toFixed(1)}
                      </span>
                    </div>
                  )}
                  {currentApp.installs && (
                    <div className="text-white/80 text-sm">
                      {currentApp.installs.toLocaleString()} installs
                    </div>
                  )}
                  <Link
                    href={`/apps/${currentApp.id}`}
                    className="ml-auto px-8 py-3 bg-white text-purple-600 rounded-full font-bold text-lg flex items-center gap-2 hover:bg-gray-100 transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105"
                  >
                    <Play className="w-5 h-5" />
                    Open App
                  </Link>
                </motion.div>
              </div>
            </div>
          </div>

          {/* Decorative elements */}
          <div className="absolute top-4 right-4 opacity-20">
            <div className="w-32 h-32 rounded-full bg-white/10 blur-3xl" />
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation Arrows */}
      {apps.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-black/50 hover:bg-black/70 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all duration-300 opacity-0 group-hover:opacity-100"
            aria-label="Previous app"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-black/50 hover:bg-black/70 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all duration-300 opacity-0 group-hover:opacity-100"
            aria-label="Next app"
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
              onClick={() => goToSlide(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? "bg-white w-8"
                  : "bg-white/50 hover:bg-white/75"
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
