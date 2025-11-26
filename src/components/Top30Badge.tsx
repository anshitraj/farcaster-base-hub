import { Badge } from "@/components/ui/badge";
import { TrendingUp } from "lucide-react";

interface Top30BadgeProps {
  rank: number;
  className?: string;
}

export default function Top30Badge({ rank, className }: Top30BadgeProps) {
  if (!rank || rank < 1 || rank > 30) return null;

  return (
    <Badge 
      className={`bg-gradient-to-r from-orange-600/20 to-red-600/20 text-orange-400 border-orange-600/50 ${className || ""}`}
    >
      <TrendingUp className="w-3 h-3 mr-1" />
      Ranked #{rank} on Base
    </Badge>
  );
}

