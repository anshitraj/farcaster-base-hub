import { Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface RankBadgeProps {
  rank: number;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export default function RankBadge({ rank, className = "", size = "md" }: RankBadgeProps) {
  const getRankColor = (rank: number) => {
    if (rank === 1) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50";
    if (rank === 2) return "bg-gray-400/20 text-gray-300 border-gray-400/50";
    if (rank === 3) return "bg-orange-600/20 text-orange-400 border-orange-600/50";
    return "bg-base-blue/20 text-base-blue border-base-blue/50";
  };

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-1",
    lg: "text-base px-3 py-1.5",
  };

  return (
    <Badge
      variant="outline"
      className={`${getRankColor(rank)} ${sizeClasses[size]} font-semibold flex items-center gap-1 ${className}`}
    >
      {rank <= 3 && <Trophy className={`${size === "sm" ? "w-3 h-3" : size === "md" ? "w-3.5 h-3.5" : "w-4 h-4"}`} />}
      <span>#{rank}</span>
    </Badge>
  );
}

