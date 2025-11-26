"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import FavoriteButton from "./FavoriteButton";
import { shortenDescription } from "@/lib/description-utils";

interface HorizontalAppCardProps {
  app: {
    id: string;
    name: string;
    description?: string;
    iconUrl: string;
    category?: string;
    clicks?: number;
    installs?: number;
    ratingAverage?: number;
  };
  showPrice?: boolean;
  price?: string;
}

export default function HorizontalAppCard({ app, showPrice = false, price }: HorizontalAppCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      className="bg-gray-900 border border-gray-800 rounded-2xl p-4 w-[280px] flex-shrink-0 hover:border-gray-700 transition-all duration-300 group"
    >
      <div className="flex flex-col h-full">
        {/* App Icon and Info */}
        <div className="flex items-start gap-3 mb-3">
          <div className="w-14 h-14 rounded-xl bg-gray-800 p-2 flex-shrink-0">
            {app.iconUrl ? (
              <img
                src={app.iconUrl}
                alt={app.name}
                className="w-full h-full object-contain rounded-lg"
              />
            ) : (
              <div className="w-full h-full rounded-lg bg-gray-700 flex items-center justify-center">
                <span className="text-lg font-bold text-gray-400">
                  {app.name.charAt(0)}
                </span>
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="text-base font-bold text-white line-clamp-1 flex-1">
                {app.name}
              </h3>
              <FavoriteButton appId={app.id} size="sm" className="flex-shrink-0" />
            </div>
            {app.description && (
              <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed mb-2">
                {shortenDescription(app.description)}
              </p>
            )}
            {app.ratingAverage && app.ratingAverage > 0 && (
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                <span className="text-xs text-gray-400">
                  {app.ratingAverage.toFixed(1)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Button */}
        <div className="mt-auto">
          <Link
            href={`/apps/${app.id}`}
            className="block w-full px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-semibold text-center transition-all duration-300"
          >
            {showPrice && price ? price : "Free"}
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

