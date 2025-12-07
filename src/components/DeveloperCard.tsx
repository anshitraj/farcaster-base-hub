"use client";

import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import VerifiedBadge from "./VerifiedBadge";

interface DeveloperCardProps {
  id: string;
  name: string | null | undefined;
  avatar?: string | null;
  wallet: string;
  badges: any[];
  appCount: number;
  verified?: boolean;
}

const DeveloperCard = ({
  id,
  name,
  avatar,
  wallet,
  badges,
  appCount,
  verified = false,
}: DeveloperCardProps) => {
  if (!wallet) {
    return null;
  }

  return (
    <Link href={`/developers/${wallet}`}>
      <motion.div
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.2 }}
      >
        <Card className="card-surface hover-glow transition-all duration-300 h-full border-[hsl(var(--border))]">
          <CardContent className="p-4 text-center">
            <div className="relative inline-block mb-3">
              {avatar ? (
                <Image
                  src={avatar}
                  alt={(name === "System" ? "Mini Cast Admin" : name) || "Developer"}
                  width={80}
                  height={80}
                  className="w-20 h-20 rounded-full bg-background-secondary p-1 ring-2 ring-base-blue/50"
                  quality={75}
                  loading="lazy"
                  sizes="80px"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-background-secondary p-1 ring-2 ring-base-blue/50 flex items-center justify-center">
                  <span className="text-2xl font-bold text-base-blue">
                    {name && name.length > 0 ? name.charAt(0).toUpperCase() : wallet.slice(2, 3).toUpperCase()}
                  </span>
                </div>
              )}
              {badges && badges.length > 0 && (
                <CheckCircle2 className="absolute -bottom-1 -right-1 w-5 h-5 text-base-blue bg-background rounded-full" />
              )}
            </div>

            <div className="mb-1">
              <div className="flex items-center justify-center gap-1.5">
                <h3 className="font-semibold text-base">{(name === "System" ? "Mini Cast Admin" : name) || `Developer ${wallet.slice(0, 6)}`}</h3>
                {verified && (
                  <VerifiedBadge type="developer" iconOnly size="md" />
                )}
              </div>
            </div>

            <p className="text-xs text-muted-foreground mb-3 font-mono truncate w-full">
              {wallet.slice(0, 6)}...{wallet.slice(-4)}
            </p>

            <div className="flex items-center justify-center gap-2 text-sm">
              <span className="text-muted-foreground">{appCount || 0}</span>
              <span className="text-muted-foreground">
                {(appCount || 0) === 1 ? "app" : "apps"}
              </span>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </Link>
  );
};

export default DeveloperCard;
