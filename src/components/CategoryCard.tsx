"use client";

import Link from "next/link";
import Image from "next/image";
import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

interface CategoryCardProps {
  name: string;
  icon: LucideIcon;
  color: string;
  href: string;
  backgroundImage?: string;
  backgroundPattern?: "action" | "puzzle" | "entertainment" | "social" | "productivity" | "communication" | "music" | "education";
}

export default function CategoryCard({
  name,
  icon: Icon,
  color,
  href,
  backgroundImage,
  backgroundPattern,
}: CategoryCardProps) {
  // CSS-based background patterns (fallback if no image provided)
  const getBackgroundPattern = () => {
    if (backgroundImage) return {};
    
    const patterns: Record<string, string> = {
      action: "linear-gradient(135deg, rgba(239, 68, 68, 0.3) 0%, rgba(220, 38, 38, 0.2) 100%), radial-gradient(circle at 20% 50%, rgba(239, 68, 68, 0.4) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(220, 38, 38, 0.3) 0%, transparent 50%)",
      puzzle: "linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(37, 99, 235, 0.2) 100%), repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(59, 130, 246, 0.1) 10px, rgba(59, 130, 246, 0.1) 20px)",
      entertainment: "linear-gradient(135deg, rgba(168, 85, 247, 0.3) 0%, rgba(147, 51, 234, 0.2) 100%), radial-gradient(circle at 30% 30%, rgba(168, 85, 247, 0.3) 0%, transparent 50%)",
      social: "linear-gradient(135deg, rgba(239, 68, 68, 0.3) 0%, rgba(220, 38, 38, 0.2) 100%), radial-gradient(circle at 70% 30%, rgba(239, 68, 68, 0.2) 0%, transparent 50%)",
      productivity: "linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(37, 99, 235, 0.2) 100%), repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(59, 130, 246, 0.1) 2px, rgba(59, 130, 246, 0.1) 4px)",
      communication: "linear-gradient(135deg, rgba(16, 185, 129, 0.3) 0%, rgba(5, 150, 105, 0.2) 100%), radial-gradient(ellipse at top, rgba(16, 185, 129, 0.2) 0%, transparent 50%)",
      music: "linear-gradient(135deg, rgba(234, 179, 8, 0.3) 0%, rgba(202, 138, 4, 0.2) 100%), repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(234, 179, 8, 0.1) 5px, rgba(234, 179, 8, 0.1) 10px)",
      education: "linear-gradient(135deg, rgba(99, 102, 241, 0.3) 0%, rgba(79, 70, 229, 0.2) 100%), repeating-linear-gradient(90deg, transparent, transparent 8px, rgba(99, 102, 241, 0.1) 8px, rgba(99, 102, 241, 0.1) 16px)",
    };
    
    return {
      background: patterns[backgroundPattern || "action"],
    };
  };

  return (
    <Link href={href} className="group block">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.3 }}
        className="relative h-48 w-full rounded-2xl overflow-hidden cursor-pointer"
      >
        {/* Background Image or Pattern */}
        {backgroundImage ? (
          <div className="absolute inset-0">
            <Image
              src={backgroundImage}
              alt={name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
              quality={75}
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors duration-300" />
          </div>
        ) : (
          <div
            className="absolute inset-0 bg-[#0d1117]"
            style={getBackgroundPattern()}
          >
            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors duration-300" />
          </div>
        )}

        {/* Content */}
        <div className="relative h-full flex flex-col items-center justify-center p-6">
          {/* Icon */}
          <div
            className={`w-16 h-16 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 mb-3`}
          >
            <Icon className="w-8 h-8 text-white stroke-2" />
          </div>
          
          {/* Category Name */}
          <p className="text-white text-base font-semibold text-center drop-shadow-lg">
            {name}
          </p>
        </div>
      </motion.div>
    </Link>
  );
}
