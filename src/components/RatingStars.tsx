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
  // If no ratings, show 5 empty stars without a rating number
  if (ratingCount === 0 || (rating === 0 && ratingCount === 0)) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <div className="flex items-center">
          {Array.from({ length: maxRating }).map((_, i) => (
            <Star
              key={`empty-${i}`}
              className="text-muted-foreground fill-muted-foreground/20"
              size={size}
            />
          ))}
        </div>
        {showNumber && (
          <span className="text-sm text-muted-foreground ml-1">
            Not rated yet
          </span>
        )}
      </div>
    );
  }

  // Calculate stars based on rating (not ratingCount)
  // Ensure rating is between 0 and maxRating
  const normalizedRating = Math.max(0, Math.min(rating, maxRating));
  const fullStars = Math.floor(normalizedRating);
  const hasHalfStar = normalizedRating % 1 >= 0.5;
  const emptyStars = maxRating - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <div className="flex items-center">
        {Array.from({ length: fullStars }).map((_, i) => (
          <Star
            key={`full-${i}`}
            className="fill-blue-500 text-blue-500"
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
              className="fill-blue-500 text-blue-500 absolute inset-0 overflow-hidden"
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
          {(normalizedRating % 1 === 0) ? normalizedRating.toString() : normalizedRating.toFixed(1)}/{maxRating}
        </span>
      )}
    </div>
  );
}

