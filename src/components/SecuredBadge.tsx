import { Badge } from "@/components/ui/badge";
import { ShieldCheck } from "lucide-react";

interface SecuredBadgeProps {
  className?: string;
}

export default function SecuredBadge({ className }: SecuredBadgeProps) {
  return (
    <Badge 
      className={`bg-gray-500/20 text-gray-300 border-gray-500/30 hover:bg-gray-500/30 ${className || ""}`}
    >
      <ShieldCheck className="w-3 h-3 mr-1" />
      Secured
    </Badge>
  );
}

