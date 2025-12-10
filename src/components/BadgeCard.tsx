import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import { optimizeDevImage, needsUnoptimized, convertBadgeImageToWebP } from "@/utils/optimizeDevImage";

interface BadgeCardProps {
  name: string;
  imageUrl: string;
  appName: string;
}

const BadgeCard = ({ name, imageUrl, appName }: BadgeCardProps) => {
  // Always use castyourapptransparent.webp for badges
  const badgeImageSrc = "/badges/castyourapptransparent.webp";
  
  return (
    <Card className="glass-card hover:bg-white/10 transition-all duration-300">
      <CardContent className="p-4 text-center">
        <Image
          src={badgeImageSrc}
          alt={name}
          width={96}
          height={96}
          className="w-24 h-24 mx-auto mb-2 rounded-lg"
          quality={75}
          loading="lazy"
          sizes="96px"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = "/badges/castyourapptransparent.webp";
          }}
        />
        <h3 className="font-semibold mb-1 text-sm">{name}</h3>
        <p className="text-xs text-muted-foreground">{appName}</p>
      </CardContent>
    </Card>
  );
};

export default BadgeCard;
