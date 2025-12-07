"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import AppGrid from "@/components/AppGrid";
import BadgeCard from "@/components/BadgeCard";
import VerifiedBadge from "@/components/VerifiedBadge";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

// Helper function to format wallet address (show first 6 and last 4 characters)
function formatWalletAddress(wallet: string): string {
  if (!wallet || wallet.length < 10) return wallet;
  if (wallet.startsWith("0x")) {
    return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
  }
  return wallet;
}

export default function DeveloperProfilePage() {
  const params = useParams();
  const wallet = params.wallet as string;
  const [developer, setDeveloper] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDeveloper() {
      try {
        const res = await fetch(`/api/developers/${wallet}`);
        if (res.ok) {
          const data = await res.json();
          setDeveloper(data.developer);
        }
      } catch (error) {
        console.error("Error fetching developer:", error);
      } finally {
        setLoading(false);
      }
    }

    if (wallet) fetchDeveloper();
  }, [wallet]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background pt-24 px-4">
        <div className="container mx-auto text-center py-20">
          <p className="text-muted-foreground">Loading developer...</p>
        </div>
      </div>
    );
  }

  if (!developer) {
    return (
      <div className="min-h-screen bg-background pt-24 px-4">
        <div className="container mx-auto text-center py-20">
          <h1 className="text-4xl font-bold mb-4">Developer Not Found</h1>
          <Link href="/developers" className="text-base-blue hover:underline">
            Back to Developers
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-6xl">
          {/* Developer Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="relative p-6 md:p-8 mb-8 rounded-xl overflow-hidden backdrop-blur-md border"
            style={{
              background: 'linear-gradient(135deg, hsl(217 100% 50% / 0.15) 0%, hsl(270 60% 65% / 0.12) 50%, hsl(220 25% 14% / 0.95) 100%)',
              borderColor: 'hsl(217 100% 50% / 0.3)',
              boxShadow: '0 8px 32px hsl(217 100% 50% / 0.15), 0 0 60px hsl(270 60% 65% / 0.1), inset 0 1px 0 hsl(217 100% 50% / 0.1)',
            }}
          >
            {/* Decorative gradient overlay */}
            <div 
              className="absolute inset-0 opacity-30 pointer-events-none"
              style={{
                background: 'radial-gradient(circle at top right, hsl(217 100% 50% / 0.2) 0%, transparent 50%)',
              }}
            />
            <div className="relative z-10 flex flex-col md:flex-row gap-6 items-center md:items-start">
              {developer.avatar && (
                <Image
                  src={developer.avatar}
                  alt={(developer.name === "System" ? "Mini Cast Admin" : developer.name) || "Developer"}
                  width={120}
                  height={120}
                  className="rounded-full"
                  priority
                  quality={85}
                  sizes="120px"
                />
              )}
              <div className="flex-1 text-center md:text-left">
                <div className="flex items-center gap-2 justify-center md:justify-start mb-2">
                  <h1 className="text-3xl md:text-4xl font-bold">
                    {(developer.name === "System" ? "Mini Cast Admin" : developer.name) || "Anonymous Developer"}
                  </h1>
                  {developer.verified && (
                    <VerifiedBadge type="developer" iconOnly size="lg" />
                  )}
                </div>
                <p className="text-muted-foreground mb-2 font-mono text-sm">
                  {formatWalletAddress(developer.wallet || "")}
                </p>
                {developer.totalXP !== undefined && developer.totalXP !== null && (
                  <div className="flex items-center gap-2 justify-center md:justify-start mb-4">
                    <Sparkles className="w-4 h-4 text-base-blue" />
                    <span className="text-muted-foreground text-sm">
                      <span className="font-semibold text-base-blue">{developer.totalXP.toLocaleString()}</span> XP
                    </span>
                  </div>
                )}
                {developer.bio && (
                  <p className="text-muted-foreground">{developer.bio}</p>
                )}
              </div>
            </div>
          </motion.div>

          {/* Badges */}
          {developer.badges && developer.badges.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="mb-8"
            >
              <h2 className="text-2xl font-bold mb-6">Badges</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {developer.badges
                  .filter((badge: any) => badge.imageUrl) // Only show badges with images
                  .map((badge: any) => (
                    <BadgeCard
                      key={badge.id}
                      name={badge.name}
                      imageUrl={badge.imageUrl}
                      appName={badge.appName}
                    />
                  ))}
              </div>
            </motion.div>
          )}

          {/* Apps */}
          {developer.apps && developer.apps.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <h2 className="text-2xl font-bold mb-6">Apps Built</h2>
              <AppGrid apps={developer.apps} variant="grid" showHorizontal={false} hideSaveButton={true} />
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

