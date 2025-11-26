import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";

interface BadgeCardProps {
  name: string;
  imageUrl: string;
  appName: string;
}

const BadgeCard = ({ name, imageUrl, appName }: BadgeCardProps) => {
  if (!imageUrl) {
    return null; // Don't render if imageUrl is missing
  }
  
  return (
    <Card className="glass-card hover:bg-white/10 transition-all duration-300">
      <CardContent className="p-4 text-center">
        <Image
          src={imageUrl}
          alt={name}
          width={64}
          height={64}
          className="w-16 h-16 mx-auto mb-2 rounded-lg"
        />
        <h3 className="font-semibold mb-1 text-sm">{name}</h3>
        <p className="text-xs text-muted-foreground">{appName}</p>
      </CardContent>
    </Card>
  );
};

export default BadgeCard;
