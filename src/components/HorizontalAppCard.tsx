"use client";

import { MiniAppListItem } from "./MiniAppListItem";

interface HorizontalAppCardProps {
  app: {
    id: string;
    name: string;
    description?: string;
    iconUrl: string;
    category?: string;
    tags?: string[];
    clicks?: number;
    installs?: number;
    ratingAverage?: number;
    ratingCount?: number;
    url?: string;
    farcasterUrl?: string;
    baseMiniAppUrl?: string;
  };
  showPrice?: boolean;
  price?: string;
}

export default function HorizontalAppCard({ app, showPrice = false, price }: HorizontalAppCardProps) {
  return (
    <div className="w-full">
      <MiniAppListItem
        id={app.id}
        icon={app.iconUrl}
        name={app.name}
        category={app.category}
        tags={app.tags}
        description={app.description}
        ratingAverage={app.ratingAverage}
        ratingCount={app.ratingCount}
        url={app.url}
        farcasterUrl={app.farcasterUrl}
        baseMiniAppUrl={app.baseMiniAppUrl}
      />
    </div>
  );
}

