"use client";

import Image from "next/image";
import { Award, User } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";

interface DashboardHeaderProps {
  name?: string;
  avatar?: string;
  wallet: string;
  developerLevel: number;
  totalXP: number;
}

export default function DashboardHeader({
  name,
  avatar,
  wallet,
  developerLevel,
  totalXP,
}: DashboardHeaderProps) {
  const shortWallet = `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mb-6"
    >
      <Card className="glass-card border-base-blue/20 bg-gradient-to-br from-base-blue/10 to-purple-500/10">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="flex-shrink-0">
              {avatar ? (
                <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-base-blue/50">
                  <Image
                    src={avatar}
                    alt={name || "Developer"}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full bg-base-blue/20 border-2 border-base-blue/50 flex items-center justify-center">
                  <User className="w-8 h-8 text-base-blue" />
                </div>
              )}
            </div>

            {/* User Info */}
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold mb-1 truncate">
                {name ? `Hi ${name.replace('.minicast', '').replace('.base.eth', '').replace('.eth', '')}!` : "Hi Developer!"}
              </h2>
              <p className="text-xs text-muted-foreground font-mono truncate mb-2">
                {shortWallet}
              </p>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-base-blue/20 border border-base-blue/30">
                  <Award className="w-4 h-4 text-base-blue" />
                  <span className="text-sm font-semibold text-base-blue">
                    Level {developerLevel}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {totalXP} XP
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

