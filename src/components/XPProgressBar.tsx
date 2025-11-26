"use client";

import { motion } from "framer-motion";
import { Award } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface XPProgressBarProps {
  currentXP: number;
  developerLevel: number;
}

const XP_PER_LEVEL = 500;

export default function XPProgressBar({
  currentXP,
  developerLevel,
}: XPProgressBarProps) {
  const xpInCurrentLevel = currentXP % XP_PER_LEVEL;
  const nextLevelXP = XP_PER_LEVEL;
  const progress = (xpInCurrentLevel / nextLevelXP) * 100;
  const nextMilestone = (developerLevel * XP_PER_LEVEL) - currentXP;

  return (
    <Card className="glass-card mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Award className="w-5 h-5 text-base-blue" />
          Developer XP
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Progress Bar */}
          <div className="relative h-3 rounded-full bg-white/5 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-base-blue via-base-cyan to-purple-500 rounded-full shadow-lg shadow-base-blue/50"
            />
          </div>

          {/* XP Info */}
          <div className="flex items-center justify-between text-sm">
            <div>
              <span className="text-muted-foreground">Current XP: </span>
              <span className="font-semibold text-base-blue">
                {xpInCurrentLevel}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Next Level: </span>
              <span className="font-semibold">{nextLevelXP} XP</span>
            </div>
          </div>

          {/* Milestone Info */}
          <div className="pt-2 border-t border-white/10">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Total XP:</span>
              <span className="font-semibold">{currentXP} XP</span>
            </div>
            <div className="flex items-center justify-between text-xs mt-1">
              <span className="text-muted-foreground">Next milestone:</span>
              <span className="font-semibold text-base-cyan">
                {nextMilestone} XP to Level {developerLevel + 1}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

