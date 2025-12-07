"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";

interface AnimatedLoaderProps {
  className?: string;
}

const loadingQuotes = [
  "Sorting Best application for u",
  "Bringing the best apps on table",
  "Finding amazing developers for you",
  "Curating top-rated mini apps",
  "Discovering hidden gems",
  "Loading premium experiences",
  "Preparing your next favorite app",
  "Scanning the best of Base",
  "Handpicking quality apps",
  "Setting up your discovery",
  "Connecting you with creators",
  "Showcasing innovation on Base",
  "Building your app collection",
  "Exploring the ecosystem",
  "Unveiling top talents",
];

export default function AnimatedLoader({ className }: AnimatedLoaderProps) {
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentQuoteIndex((prev) => (prev + 1) % loadingQuotes.length);
    }, 2000); // Change quote every 2 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`flex flex-col items-center justify-center gap-6 min-h-[400px] ${className || ""}`}>
      {/* Animated Spinner */}
      <div className="relative">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <Loader2 className="w-12 h-12 text-base-blue" />
        </motion.div>
        
        {/* Pulsing rings */}
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-base-blue/30"
          animate={{
            scale: [1, 1.5, 2],
            opacity: [0.8, 0.4, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeOut",
          }}
        />
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-base-blue/20"
          animate={{
            scale: [1, 1.5, 2],
            opacity: [0.6, 0.3, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeOut",
            delay: 0.3,
          }}
        />
      </div>

      {/* Animated Progress Bar */}
      <div className="w-full max-w-md">
        <div className="h-1 bg-background-secondary rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-base-blue to-purple rounded-full"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </div>
      </div>

      {/* Rotating Quotes */}
      <div className="h-12 flex items-center justify-center w-full max-w-md">
        <AnimatePresence mode="wait">
          <motion.p
            key={currentQuoteIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{
              duration: 0.5,
              ease: "easeInOut",
            }}
            className="text-center text-base text-foreground font-medium"
          >
            {loadingQuotes[currentQuoteIndex]}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Loading dots animation */}
      <div className="flex gap-2">
        {[0, 1, 2].map((index) => (
          <motion.div
            key={index}
            className="w-2 h-2 rounded-full bg-base-blue"
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: index * 0.2,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    </div>
  );
}

