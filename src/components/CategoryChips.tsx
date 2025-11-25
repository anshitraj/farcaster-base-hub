import { cn } from "@/lib/utils";

interface CategoryChipsProps {
  categories: string[];
  selected: string | null;
  onSelect: (category: string | null) => void;
}

const CategoryChips = ({ categories, selected, onSelect }: CategoryChipsProps) => {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      <button
        onClick={() => onSelect(null)}
        className={cn(
          "px-4 py-2 rounded-full text-sm font-medium transition-all duration-300",
          "glass-card hover:bg-white/10",
          selected === null && "bg-base-blue text-white glow-base-blue"
        )}
      >
        All
      </button>
      {categories.map((category) => (
        <button
          key={category}
          onClick={() => onSelect(category)}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-medium transition-all duration-300",
            "glass-card hover:bg-white/10",
            selected === category && "bg-base-blue text-white glow-base-blue"
          )}
        >
          {category}
        </button>
      ))}
    </div>
  );
};

export default CategoryChips;
