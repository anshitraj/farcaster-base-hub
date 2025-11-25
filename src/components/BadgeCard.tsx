import { Card, CardContent } from "@/components/ui/card";

interface BadgeCardProps {
  name: string;
  description: string;
  icon: string;
  rarity: string;
}

const BadgeCard = ({ name, description, icon, rarity }: BadgeCardProps) => {
  const rarityColors = {
    common: "bg-gray-500/20 text-gray-300",
    uncommon: "bg-green-500/20 text-green-300",
    rare: "bg-blue-500/20 text-blue-300",
    legendary: "bg-purple-500/20 text-purple-300",
  };

  return (
    <Card className="glass-card hover:bg-white/10 transition-all duration-300">
      <CardContent className="p-4 text-center">
        <div className="text-4xl mb-2">{icon}</div>
        <h3 className="font-semibold mb-1">{name}</h3>
        <p className="text-xs text-muted-foreground mb-2">{description}</p>
        <span className={`text-xs px-2 py-1 rounded-full ${rarityColors[rarity as keyof typeof rarityColors] || rarityColors.common}`}>
          {rarity}
        </span>
      </CardContent>
    </Card>
  );
};

export default BadgeCard;
