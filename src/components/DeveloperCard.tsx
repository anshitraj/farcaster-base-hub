import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

interface DeveloperCardProps {
  id: string;
  name: string;
  avatar: string;
  wallet: string;
  badges: string[];
  appCount: number;
}

const DeveloperCard = ({ id, name, avatar, wallet, badges, appCount }: DeveloperCardProps) => {
  return (
    <Link to={`/developers/${id}`}>
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.2 }}
      >
        <Card className="glass-card hover:bg-white/10 transition-all duration-300 group">
        <CardContent className="p-6 text-center">
          <img
            src={avatar}
            alt={name}
            className="w-24 h-24 rounded-full mx-auto mb-4 bg-background-secondary p-1 ring-2 ring-base-blue/50"
          />
          
          <h3 className="font-semibold text-lg mb-1 group-hover:text-base-blue transition-colors">
            {name}
          </h3>
          
          <p className="text-xs text-muted-foreground mb-3 font-mono">
            {wallet}
          </p>

          <div className="flex flex-wrap gap-1 justify-center mb-3">
            {badges.slice(0, 3).map((badge, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="text-xs bg-base-blue/20 text-base-cyan border-none"
              >
                {badge}
              </Badge>
            ))}
          </div>

          <p className="text-sm text-muted-foreground">
            {appCount} {appCount === 1 ? "app" : "apps"}
          </p>
        </CardContent>
      </Card>
      </motion.div>
    </Link>
  );
};

export default DeveloperCard;
