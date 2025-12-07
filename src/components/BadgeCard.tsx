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
  
  // Route external URLs through API to handle errors gracefully
  const isExternal = imageUrl.startsWith("http://") || imageUrl.startsWith("https://");
  const safeSrc = isExternal 
    ? `/api/icon?url=${encodeURIComponent(imageUrl)}`
    : imageUrl;
  
  return (
    <Card className="glass-card hover:bg-white/10 transition-all duration-300">
      <CardContent className="p-4 text-center">
        <Image
          src={safeSrc}
          alt={name}
          width={64}
          height={64}
          className="w-16 h-16 mx-auto mb-2 rounded-lg"
          quality={75}
          loading="lazy"
          sizes="64px"
          unoptimized={isExternal}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = "/placeholder.svg";
          }}
        />
        <h3 className="font-semibold mb-1 text-sm">{name}</h3>
        <p className="text-xs text-muted-foreground">{appName}</p>
      </CardContent>
    </Card>
  );
};

export default BadgeCard;
