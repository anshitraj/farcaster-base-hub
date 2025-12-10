"use client";

import { useState, useEffect, useRef } from "react";
import { CastCard } from "./CastCard";

interface Cast {
  id: string;
  authorName?: string;
  authorHandle?: string;
  authorAvatar?: string;
  content: string;
  mediaUrl?: string;
  createdAt: string;
}

export function FarcasterReel() {
  const [casts, setCasts] = useState<Cast[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef<number | null>(null);
  const isHoveringRef = useRef(false);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    fetchCasts();
    
    // Refresh every 5 seconds to pick up deletions immediately
    const refreshInterval = setInterval(() => {
      fetchCasts();
    }, 5000);
    
    return () => clearInterval(refreshInterval);
  }, []);

  async function fetchCasts() {
    try {
      // Add cache-busting timestamp to prevent browser caching
      const res = await fetch(`/api/base-social-feed?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      if (res.ok) {
        const data = await res.json();
        setCasts(data.posts || []);
      }
    } catch (error) {
      console.error("Error fetching base social feed:", error);
    } finally {
      setLoading(false);
    }
  }

  // Auto-scroll logic
  useEffect(() => {
    if (!scrollContainerRef.current || casts.length === 0) return;

    const container = scrollContainerRef.current;
    const cardWidth = 320; // Width of each card + gap
    const scrollInterval = 3000; // 3 seconds

    const autoScroll = () => {
      if (isHoveringRef.current || isDraggingRef.current) return;

      const currentScroll = container.scrollLeft;
      const maxScroll = container.scrollWidth - container.clientWidth;
      
      // If at the end, reset to start (infinite loop)
      if (currentScroll >= maxScroll - 10) {
        container.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        // Scroll to next card
        const nextPosition = Math.min(
          currentScroll + cardWidth,
          maxScroll
        );
        container.scrollTo({ left: nextPosition, behavior: "smooth" });
      }
    };

    autoScrollRef.current = window.setInterval(autoScroll, scrollInterval);

    return () => {
      if (autoScrollRef.current) {
        clearInterval(autoScrollRef.current);
      }
    };
  }, [casts]);

  // Handle hover to pause auto-scroll
  const handleMouseEnter = () => {
    isHoveringRef.current = true;
  };

  const handleMouseLeave = () => {
    isHoveringRef.current = false;
  };

  // Handle touch/drag for mobile
  const handleTouchStart = () => {
    isDraggingRef.current = true;
  };

  const handleTouchEnd = () => {
    // Resume auto-scroll after a delay
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 1000);
  };

  if (loading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="w-[300px] h-64 bg-gray-900/50 rounded-2xl animate-pulse flex-shrink-0"
          />
        ))}
      </div>
    );
  }

  if (casts.length === 0) {
    return null;
  }

  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div
        ref={scrollContainerRef}
        className="flex gap-4 overflow-x-auto scroll-smooth pb-4 no-scrollbar"
        style={{
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {casts.map((cast) => (
          <div
            key={cast.id}
            className="flex-shrink-0"
            style={{ scrollSnapAlign: "start" }}
          >
            <CastCard cast={cast} />
          </div>
        ))}
      </div>
    </div>
  );
}

