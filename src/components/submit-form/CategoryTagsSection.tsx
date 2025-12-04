"use client";

import { useState, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { List, X, ChevronDown, ChevronUp } from "lucide-react";

const categories = ["Finance", "Tools", "Social", "Airdrops", "Games", "Memecoins", "Utilities", "Education", "Entertainment", "News", "Art", "Productivity", "Tech", "Shopping"];

const validAppTags = [
  "airdrop", "airdrops", "analytics", "apy", "articles", "badges", "base", "collectibles",
  "contracts", "crypto", "debug", "defi", "developer", "dex", "ens", "explorer", "gifts",
  "giveaway", "identity", "liquidity", "nft", "payment", "social", "swap", "tools", "trading",
  "wallet", "web3",
];

interface CategoryTagsSectionProps {
  category: string;
  tags: string[];
  onCategoryChange: (value: string) => void;
  onTagsChange: (tags: string[]) => void;
}

export default function CategoryTagsSection({
  category,
  tags,
  onCategoryChange,
  onTagsChange,
}: CategoryTagsSectionProps) {
  const [showAllTags, setShowAllTags] = useState(false);

  // Get 5 random tags, but prioritize selected tags and ensure they're always shown
  const displayedTags = useMemo(() => {
    if (showAllTags) {
      return validAppTags;
    }

    // Always include selected tags first
    const selectedTags = tags.filter(tag => validAppTags.includes(tag));
    const unselectedTags = validAppTags.filter(tag => !tags.includes(tag));
    
    // Shuffle unselected tags and take enough to make 5 total
    const shuffled = [...unselectedTags].sort(() => Math.random() - 0.5);
    const needed = Math.max(0, 5 - selectedTags.length);
    const randomUnselected = shuffled.slice(0, needed);
    
    return [...selectedTags, ...randomUnselected].slice(0, 5);
  }, [showAllTags, tags]);

  const handleTagToggle = (tag: string) => {
    if (tags.includes(tag)) {
      onTagsChange(tags.filter((t) => t !== tag));
    } else if (tags.length < 5) {
      onTagsChange([...tags, tag]);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
          <span>🏷️</span> CATEGORIES & TAGS
        </h3>
        <p className="text-xs text-white/50 mb-4">Help users discover your app</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="category" className="text-xs font-semibold text-white/80 flex items-center gap-1.5">
            <span>📂</span> Category <span className="text-red-400">*</span>
          </Label>
          <div className="relative">
            <List className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 z-10" />
            <Select value={category} onValueChange={onCategoryChange}>
              <SelectTrigger className="pl-10 h-12 bg-[#0f0f15] border-transparent focus:ring-purple-500/50 rounded-xl">
                <SelectValue placeholder="Select a category..." />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1f2e] border-white/10">
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat} className="hover:bg-white/10">
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-white/80 flex items-center gap-1.5">
            <span>🏷️</span> Tags{" "}
            {tags.length > 0 && (
              <span className="text-purple-400 font-normal">({tags.length}/5)</span>
            )}{" "}
            <span className="text-white/40 text-[10px]">(Optional)</span>
          </Label>
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-[#0f0f15] border border-white/10 max-h-40 overflow-y-auto">
              {displayedTags.map((tag) => {
                const isSelected = tags.includes(tag);
                const isDisabled = !isSelected && tags.length >= 5;
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleTagToggle(tag)}
                    disabled={isDisabled}
                    className={`
                      inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all
                      ${
                        isSelected
                          ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50"
                          : isDisabled
                          ? "bg-white/5 text-white/30 border border-white/5 cursor-not-allowed"
                          : "bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 hover:border-purple-500/50 hover:text-white cursor-pointer"
                      }
                    `}
                  >
                    {tag}
                    {isSelected && <X className="w-3 h-3" />}
                  </button>
                );
              })}
            </div>
            {!showAllTags && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowAllTags(true)}
                className="w-full text-xs text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
              >
                Show more tags ({validAppTags.length - displayedTags.length} more)
                <ChevronDown className="w-3 h-3 ml-1" />
              </Button>
            )}
            {showAllTags && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowAllTags(false)}
                className="w-full text-xs text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
              >
                Show less
                <ChevronUp className="w-3 h-3 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

