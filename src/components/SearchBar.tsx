"use client";

import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onClear?: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

const SearchBar = ({
  value,
  onChange,
  placeholder = "Search mini apps...",
  onClear,
  onKeyDown,
}: SearchBarProps) => {
  return (
    <div className="relative w-full px-4">
      <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        className="pl-12 pr-10 h-12 rounded-full bg-[#1E1E1E] border border-[#2A2A2A] text-base text-white placeholder:text-[#888] focus-visible:ring-base-blue focus-visible:ring-2 focus-visible:border-base-blue"
      />
      {value && (
        <button
          onClick={() => {
            onChange("");
            onClear?.();
          }}
          className="absolute right-6 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default SearchBar;
