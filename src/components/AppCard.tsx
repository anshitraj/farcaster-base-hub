import { Link } from "react-router-dom";
import { Star, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

interface AppCardProps {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  category: string;
  stats: {
    users: string;
    rating: number;
  };
  featured?: boolean;
}

const AppCard = ({ id, name, description, iconUrl, category, stats, featured }: AppCardProps) => {
  return (
    <Link to={`/apps/${id}`}>
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.2 }}
      >
        <Card className="glass-card hover:bg-white/10 transition-all duration-300 group">
        <CardContent className="p-6">
          <div className="flex items-start gap-4 mb-4">
            <img
              src={iconUrl}
              alt={name}
              className="w-16 h-16 rounded-xl bg-background-secondary p-2"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-lg truncate group-hover:text-base-blue transition-colors">
                  {name}
                </h3>
                {featured && (
                  <span className="text-xs bg-base-blue/20 text-base-blue px-2 py-0.5 rounded-full">
                    Featured
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mb-2">{category}</p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
            {description}
          </p>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-base-cyan text-base-cyan" />
              <span>{stats.rating}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{stats.users}</span>
            </div>
          </div>
        </CardContent>
      </Card>
      </motion.div>
    </Link>
  );
};

export default AppCard;
