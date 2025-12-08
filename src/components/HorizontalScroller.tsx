"use client";

import { ReactNode } from "react";

interface HorizontalScrollerProps {
  children: ReactNode;
  title?: string | ReactNode;
  viewAllHref?: string;
  className?: string;
}

export default function HorizontalScroller({
  children,
  title,
  viewAllHref,
  className = "",
}: HorizontalScrollerProps) {
  return (
    <div className={className}>
      {(title || viewAllHref) && (
        <div className="flex items-center justify-between mb-4 px-4">
          {title && (
            <h2 className="text-lg font-semibold text-foreground">
              {typeof title === "string" ? title : title}
            </h2>
          )}
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
      <div className="overflow-x-auto scroll-smooth no-scrollbar pb-2">
        <div className="flex gap-2.5 px-4 min-w-max">
          {children}
        </div>
      </div>
    </div>
  );
}

