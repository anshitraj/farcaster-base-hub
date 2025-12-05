import { Card, CardContent } from "@/components/ui/card";
import { Star } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";

interface ReviewCardProps {
  userName: string;
  userAvatar: string;
  rating: number;
  comment: string;
  date: string;
}

const ReviewCard = ({ userName, userAvatar, rating, comment, date }: ReviewCardProps) => {
  // Generate a fallback avatar based on username if no avatar provided
  const getFallbackAvatar = (name: string) => {
    if (userAvatar && userAvatar !== "https://via.placeholder.com/48") {
      return userAvatar;
    }
    // Generate a consistent avatar based on username
    const seed = name || "anonymous";
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9&hairColor=77311d,4a312c`;
  };

  const avatarUrl = getFallbackAvatar(userName);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="glass-card">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="relative w-12 h-12 rounded-full bg-background-secondary p-1 flex-shrink-0">
              <Image
                src={avatarUrl}
                alt={userName}
                width={48}
                height={48}
                className="w-full h-full rounded-full object-cover"
                onError={(e) => {
                  // Fallback to a default avatar if image fails to load
                  const target = e.target as HTMLImageElement;
                  target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(userName || "user")}&backgroundColor=b6e3f4,c0aede,d1d4f9&hairColor=77311d,4a312c`;
                }}
              />
            </div>
            
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h4 className="font-semibold">{userName}</h4>
                  <p className="text-xs text-muted-foreground">{date}</p>
                </div>
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < rating
                          ? "fill-base-cyan text-base-cyan"
                          : "text-muted-foreground"
                      }`}
                    />
                  ))}
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground mb-3">{comment}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ReviewCard;
