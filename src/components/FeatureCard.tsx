"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ExternalLink, Sparkles } from "lucide-react";
import FavoriteButton from "./FavoriteButton";
import { shortenDescription } from "@/lib/description-utils";

interface FeatureCardProps {
  id: string;
  name: string;
  description?: string;
  iconUrl: string;
  gradient: string; // e.g., "from-green-500 to-black"
  buttonText?: string;
  buttonColor?: string;
  variant?: "large" | "medium" | "small";
}

export default function FeatureCard({
  id,
  name,
  description,
  iconUrl,
  gradient,
  buttonText = "Open",
  buttonColor = "bg-base-blue",
  variant = "medium",
}: FeatureCardProps) {
  const sizeClasses = {
    large: "col-span-2 row-span-2 min-h-[420px] w-full",
    medium: "col-span-1 row-span-1 min-h-[240px] w-full",
    small: "col-span-1 row-span-1 min-h-[180px] w-full",
  };

  return (
    <Link href={`/apps/${id}`}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.03, y: -8 }}
        whileTap={{ scale: 0.98 }}
        transition={{ 
          type: "spring", 
          stiffness: 300, 
          damping: 25,
          hover: { duration: 0.2 }
        }}
        className={`relative rounded-3xl overflow-hidden ${sizeClasses[variant]} group cursor-pointer`}
      >
        {/* Enhanced Gradient Background with Animation */}
        <motion.div 
          className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-95`}
          animate={{
            backgroundPosition: ["0% 0%", "100% 100%"],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            repeatType: "reverse",
          }}
        />
        
        {/* Animated overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        {/* Shimmer effect */}
        <motion.div
          className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
          }}
        />

        {/* Content */}
        <div className="relative h-full p-6 md:p-8 flex flex-col justify-between z-10">
          {/* Favorite Button - Top Right */}
          <div className="absolute top-4 right-4 z-20">
            <div onClick={(e) => e.stopPropagation()}>
              <FavoriteButton appId={id} size="md" className="bg-white/10 backdrop-blur-md rounded-full p-2" />
            </div>
          </div>

          {/* Icon/Image with enhanced styling */}
          <div className="mb-4">
            {iconUrl && (
              <motion.div 
                whileHover={{ rotate: [0, -5, 5, -5, 0], scale: 1.1 }}
                transition={{ duration: 0.5 }}
                className="w-20 h-20 rounded-2xl bg-white/15 backdrop-blur-md p-3 mb-4 shadow-2xl border border-white/20"
              >
                <Image
                  src={iconUrl}
                  alt={name}
                  width={80}
                  height={80}
                  className="w-full h-full object-contain rounded-xl"
                  unoptimized
                />
              </motion.div>
            )}
            <motion.h3 
              className="text-2xl md:text-3xl font-extrabold text-white mb-2 drop-shadow-lg"
              whileHover={{ x: 4 }}
            >
              {name}
            </motion.h3>
            {description && (
              <p className="text-sm md:text-base text-white/90 line-clamp-3 leading-relaxed drop-shadow-md">
                {shortenDescription(description)}
              </p>
            )}
          </div>

          {/* Enhanced Button with glow effect */}
          <motion.div
            whileHover={{ x: 4 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <motion.button
              whileHover={{ scale: 1.08, boxShadow: "0 10px 40px rgba(0,0,0,0.3)" }}
              whileTap={{ scale: 0.95 }}
              className={`${buttonColor} text-white px-6 py-3 rounded-full text-sm font-bold flex items-center gap-2 w-fit shadow-2xl hover:shadow-[0_0_30px_rgba(0,102,255,0.5)] transition-all backdrop-blur-sm border border-white/20`}
            >
              {buttonText}
              <motion.div
                animate={{ x: [0, 4, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <ExternalLink className="w-4 h-4" />
              </motion.div>
            </motion.button>
          </motion.div>
        </div>

        {/* Decorative sparkles for large variant */}
        {variant === "large" && (
          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <Sparkles className="w-6 h-6 text-white/60" />
          </div>
        )}

        {/* Border glow on hover */}
        <div className="absolute inset-0 rounded-3xl border-2 border-white/0 group-hover:border-white/20 transition-all duration-300 pointer-events-none" />
      </motion.div>
    </Link>
  );
}

