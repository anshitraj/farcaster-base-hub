"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface CategoryCardProps {
  title: string;
  count?: number;
  icon: LucideIcon;
  iconColor: string;
  onClick?: () => void;
}

export default function CategoryCard({
  title,
  count,
  icon: Icon,
  iconColor,
  onClick,
}: CategoryCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.05, y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ 
        type: "spring", 
        stiffness: 300, 
        damping: 20,
        hover: { duration: 0.2 }
      }}
      onClick={onClick}
      className="relative group cursor-pointer flex-shrink-0 w-[140px] md:w-auto"
    >
      <div className="relative bg-gradient-to-br from-[#141A24] to-[#0F1419] border border-[#1F2733] rounded-2xl p-4 md:p-5 hover:border-opacity-60 transition-all duration-300 w-full overflow-hidden backdrop-blur-sm">
        {/* Animated background gradient on hover */}
        <motion.div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{
            background: `linear-gradient(135deg, ${iconColor}15, ${iconColor}05)`,
          }}
        />
        
        {/* Glow effect */}
        <div 
          className="absolute inset-0 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle at center, ${iconColor}30, transparent 70%)`,
          }}
        />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <motion.div
              whileHover={{ rotate: [0, -10, 10, -10, 0], scale: 1.1 }}
              transition={{ duration: 0.5 }}
              className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg backdrop-blur-sm"
              style={{ 
                backgroundColor: `${iconColor}20`,
                boxShadow: `0 4px 20px ${iconColor}30`,
              }}
            >
              <Icon className="w-6 h-6" style={{ color: iconColor }} />
            </motion.div>
            {count !== undefined && count > 0 && (
              <motion.span 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="text-xs font-semibold text-[#A0A4AA] bg-[#1F2733] px-2 py-1 rounded-full"
              >
                {count.toLocaleString()}
              </motion.span>
            )}
          </div>
          <h3 className="text-sm font-bold text-white group-hover:text-transparent group-hover:bg-clip-text transition-all duration-300"
              style={{
                backgroundImage: `linear-gradient(135deg, ${iconColor}, ${iconColor}CC)`,
              }}
          >
            {title}
          </h3>
        </div>

        {/* Shine effect on hover */}
        <motion.div
          className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
          }}
        />
      </div>
    </motion.div>
  );
}

