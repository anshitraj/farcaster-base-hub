"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Star, Gamepad2 } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import AppHeader from "@/components/AppHeader";
import OptimizedImage from "@/components/OptimizedImage";
import { optimizeDevImage } from "@/utils/optimizeDevImage";

// Dynamically import framer-motion with reduced motion support
const MotionDiv = dynamic(
  () => import("framer-motion").then((mod) => mod.motion.div),
  { ssr: false }
);

interface GamesPageClientProps {
  initialGames: any[];
}

export default function GamesPageClient({ initialGames }: GamesPageClientProps) {
  const [games] = useState(initialGames);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarHidden, setSidebarHidden] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check for reduced motion preference client-side
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const handleSidebarChange = (collapsed: boolean, hidden: boolean) => {
    setSidebarCollapsed(collapsed);
    setSidebarHidden(hidden);
  };

  const animationProps = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.4 },
      };

  return (
    <div className="flex min-h-screen bg-black">
      {/* Sidebar */}
      <Sidebar onCollapseChange={handleSidebarChange} />

      {/* Main Content */}
      <main className={`flex-1 min-h-screen w-full pb-20 lg:pb-0 transition-all duration-300 ${
        sidebarHidden 
          ? "ml-0" 
          : sidebarCollapsed 
            ? "lg:ml-16 ml-0" 
            : "lg:ml-64 ml-0"
      }`}>
        <AppHeader />
        
        {/* Page Header */}
        <div className="sticky top-[73px] z-40 bg-black/80 backdrop-blur-2xl border-b border-gray-800/50">
          <div className="px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center border border-purple-500/30">
                <Gamepad2 className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-white">My Games</h1>
                <p className="text-sm text-gray-400">All available games</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 md:px-6 lg:px-8 py-6 md:py-8">
          {games.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {games.map((game, index) => {
                const GameCard = prefersReducedMotion ? "div" : MotionDiv;
                const cardProps = prefersReducedMotion
                  ? {}
                  : {
                      ...animationProps,
                      transition: { duration: 0.4, delay: index * 0.05 },
                    };

                return (
                  <GameCard
                    key={game.id}
                    {...cardProps}
                    className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition-all duration-300 group"
                  >
                    <div className="flex items-start gap-4 mb-4">
                      {game.iconUrl ? (
                        <div className="w-16 h-16 rounded-xl bg-gray-800 p-2 flex-shrink-0">
                          <OptimizedImage
                            src={optimizeDevImage(game.iconUrl)}
                            alt={game.name}
                            width={64}
                            height={64}
                            className="w-full h-full object-contain rounded-lg"
                            sizes="(max-width: 640px) 64px, 64px"
                            priority={index < 6}
                          />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-gray-800 flex items-center justify-center flex-shrink-0">
                          <span className="text-2xl font-bold text-gray-500">
                            {game.name.charAt(0)}
                          </span>
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-white mb-1 line-clamp-1">
                          {game.name}
                        </h3>
                        <p className="text-sm text-gray-400 line-clamp-2 leading-relaxed">
                          {game.description || "No description available"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <Link
                        href={`/apps/${game.id}`}
                        className="px-6 py-2.5 bg-gray-800 hover:bg-gray-700 text-blue-400 rounded-lg text-sm font-semibold transition-all duration-300"
                      >
                        Play
                      </Link>
                      
                      <div className="flex items-center gap-2">
                        <Star className="w-5 h-5 text-yellow-400 fill-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" />
                        <span className="text-yellow-400 font-bold text-sm drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]">
                          {game.clicks || game.installs || 50}
                        </span>
                      </div>
                    </div>
                  </GameCard>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="w-20 h-20 rounded-full bg-gray-900 flex items-center justify-center mx-auto mb-4 border border-gray-800">
                <Gamepad2 className="w-10 h-10 text-gray-600" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">No games found</h2>
              <p className="text-gray-400 mb-6">Check back soon for new games!</p>
              <Link
                href="/apps"
                className="inline-block px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-colors"
              >
                Browse All Apps
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

