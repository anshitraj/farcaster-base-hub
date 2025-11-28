"use client";

import { Star } from "lucide-react";

interface RatingStarsProps {
  rating: number;
  ratingCount?: number;
  maxRating?: number;
  size?: number;
  showNumber?: boolean;
  className?: string;
}

export default function RatingStars({
  rating,
  ratingCount = 0,
  maxRating = 5,
  size = 16,
  showNumber = false,
  className = "",
}: RatingStarsProps) {
  // If no ratings, show "Not rated yet" or "Unrated"
  if (ratingCount === 0 || rating === 0) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <span className="text-xs text-muted-foreground">
          Not rated yet
        </span>
      </div>
    );
  }

  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = maxRating - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <div className="flex items-center">
        {Array.from({ length: fullStars }).map((_, i) => (
          <Star
            key={`full-${i}`}
            className="fill-base-cyan text-base-cyan"
            size={size}
          />
        ))}
        {hasHalfStar && (
          <div className="relative">
            <Star
              className="text-muted-foreground"
              size={size}
            />
            <Star
              className="fill-base-cyan text-base-cyan absolute inset-0 overflow-hidden"
              size={size}
              style={{ clipPath: "inset(0 50% 0 0)" }}
            />
          </div>
        )}
        {Array.from({ length: emptyStars }).map((_, i) => (
          <Star
            key={`empty-${i}`}
            className="text-muted-foreground fill-muted-foreground/20"
            size={size}
          />
        ))}
      </div>
      {showNumber && (
        <span className="text-sm text-muted-foreground ml-1">
          {(rating % 1 === 0) ? rating.toString() : rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}

