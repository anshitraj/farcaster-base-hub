"use client";

import React from "react";
import AppCard from "./AppCard";
import HorizontalScroller from "./HorizontalScroller";

interface App {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  category: string;
  ratingAverage?: number;
  ratingCount?: number;
  installs?: number;
  clicks?: number;
  featured?: boolean;
  developer?: {
    id?: string;
    wallet?: string;
    name?: string;
    avatar?: string;
  };
}

interface AppGridProps {
  apps: App[];
  title?: string | React.ReactNode;
  viewAllHref?: string;
  variant?: "horizontal" | "grid" | "featured";
  showHorizontal?: boolean;
  hideSaveButton?: boolean; // Hide the save/favorite button
}

const AppGrid = ({
  apps,
  title,
  viewAllHref,
  variant = "horizontal",
  showHorizontal = true,
  hideSaveButton = false,
}: AppGridProps) => {
  // Filter out apps without IDs
  const validApps = apps.filter((app) => app.id);

  if (validApps.length === 0) {
    return (
      <div className="px-4">
        {title && (
          <h2 className="text-lg font-semibold mb-4">
            {typeof title === "string" ? title : title}
          </h2>
        )}
        <p className="text-center text-muted-foreground py-8 text-sm">
          No apps available
        </p>
      </div>
    );
  }

  // Mobile: horizontal scroll
  if (showHorizontal && variant === "horizontal") {
    return (
      <HorizontalScroller title={title} viewAllHref={viewAllHref}>
        {validApps.map((app: any) => (
          <AppCard 
            key={app.id} 
            {...app} 
            variant="horizontal"
            topBaseRank={app.topBaseRank}
            autoUpdated={app.autoUpdated}
            hideSaveButton={hideSaveButton}
          />
        ))}
      </HorizontalScroller>
    );
  }

  // Desktop: grid layout
  return (
    <div className="px-4">
      {title && (
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            {typeof title === "string" ? title : title}
          </h2>
          {viewAllHref && (
            <a
              href={viewAllHref}
              className="text-base-blue text-sm font-medium hover:text-base-cyan transition-colors"
            >
              View All →
            </a>
          )}
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {validApps.map((app: any) => (
          <AppCard 
            key={app.id} 
            {...app} 
            variant={variant}
            topBaseRank={app.topBaseRank}
            autoUpdated={app.autoUpdated}
            hideSaveButton={hideSaveButton}
          />
        ))}
      </div>
    </div>
  );
};

export default AppGrid;
