"use client";

import HorizontalScroller from "./HorizontalScroller";
import PremiumCard from "./PremiumCard";

interface PremiumAppCarouselProps {
  title: string;
  subtitle?: string;
  apps: any[];
  isLocked?: boolean;
  onSubscribe?: () => void;
}

export default function PremiumAppCarousel({
  title,
  subtitle,
  apps,
  isLocked = false,
  onSubscribe,
}: PremiumAppCarouselProps) {
  if (apps.length === 0) return null;

  return (
    <section className="py-6">
      <div className="max-w-screen-md mx-auto px-4 mb-4">
        <h2 className="text-lg font-semibold mb-1">{title}</h2>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
      <HorizontalScroller>
        {apps.map((app: any) => (
          <PremiumCard
            key={app.id}
            id={app.id}
            name={app.name}
            description={app.description}
            iconUrl={app.iconUrl}
            category={app.category}
            ratingAverage={app.ratingAverage || 0}
            ratingCount={app.ratingCount || 0}
            installs={app.installs || 0}
            isLocked={isLocked}
            onSubscribe={onSubscribe}
          />
        ))}
      </HorizontalScroller>
    </section>
  );
}

