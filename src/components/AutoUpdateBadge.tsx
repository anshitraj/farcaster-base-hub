import { Badge } from "@/components/ui/badge";
import { Zap } from "lucide-react";

interface AutoUpdateBadgeProps {
  className?: string;
}

export default function AutoUpdateBadge({ className }: AutoUpdateBadgeProps) {
  return (
    <Badge 
      className={`bg-gradient-to-r from-base-blue/20 to-base-cyan/20 text-base-blue border-base-blue/50 ${className || ""}`}
    >
      <Zap className="w-3 h-3 mr-1" />
      Auto-Synced
    </Badge>
  );
}

