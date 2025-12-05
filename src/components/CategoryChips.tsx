"use client";

import { cn } from "@/lib/utils";
import HorizontalScroller from "./HorizontalScroller";

interface CategoryChipsProps {
  categories: string[];
  selected: string | null;
  onSelect: (category: string | null) => void;
}

const CategoryChips = ({ categories, selected, onSelect }: CategoryChipsProps) => {
  return (
    <HorizontalScroller>
      <button
        onClick={() => onSelect(null)}
        className={cn(
          "px-4 py-2 rounded-full text-sm font-medium transition-all duration-100 whitespace-nowrap flex-shrink-0 touch-manipulation",
          "card-surface hover-glow border-[hsl(var(--border))]",
          selected === null
            ? "bg-base-blue text-white border-base-blue glow-base-blue"
            : "text-muted-foreground hover:text-base-blue active:bg-base-blue/10"
        )}
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        All
      </button>
      {categories.map((category) => (
        <button
          key={category}
          onClick={() => onSelect(category)}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-medium transition-all duration-100 whitespace-nowrap flex-shrink-0 touch-manipulation",
            "card-surface hover-glow border-[hsl(var(--border))]",
            selected === category
              ? "bg-base-blue text-white border-base-blue glow-base-blue"
              : "text-muted-foreground hover:text-base-blue active:bg-base-blue/10"
          )}
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          {category}
        </button>
      ))}
    </HorizontalScroller>
  );
};

export default CategoryChips;
