"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import GlowButton from "@/components/GlowButton";
import { useToast } from "@/hooks/use-toast";
import { Flame, Clock, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import StreakCalendar from "./StreakCalendar";

interface DailyClaimCardProps {
  streakCount: number;
  lastClaimDate: Date | null;
  canClaim: boolean;
  hoursRemaining: number;
  minutesRemaining: number;
  onClaimSuccess: () => void;
}

export default function DailyClaimCard({
  streakCount,
  lastClaimDate,
  canClaim,
  hoursRemaining,
  minutesRemaining,
  onClaimSuccess,
}: DailyClaimCardProps) {
  const [claiming, setClaiming] = useState(false);
  const [countdown, setCountdown] = useState({ hours: hoursRemaining, minutes: minutesRemaining });
  const { toast } = useToast();

  // Update countdown
  useEffect(() => {
    if (!canClaim && (countdown.hours > 0 || countdown.minutes > 0)) {
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev.minutes > 0) {
            return { ...prev, minutes: prev.minutes - 1 };
          } else if (prev.hours > 0) {
            return { hours: prev.hours - 1, minutes: 59 };
          } else {
            return { hours: 0, minutes: 0 };
          }
        });
      }, 60000); // Update every minute

      return () => clearInterval(interval);
    }
  }, [canClaim, countdown]);

  const handleClaim = async () => {
    if (!canClaim || claiming) return;

    setClaiming(true);
    try {
      const res = await fetch("/api/xp/claim", {
        method: "POST",
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to claim XP");
      }

      if (data.isWeeklyReward) {
        toast({
          title: "🔥 Big Reward!",
          description: `+${data.reward} XP for completing the weekly streak!`,
        });
      } else {
        toast({
          title: "XP Earned!",
          description: `+${data.reward} XP earned!`,
        });
      }

      onClaimSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to claim XP",
        variant: "destructive",
      });
    } finally {
      setClaiming(false);
    }
  };

  const isWeeklyReward = streakCount === 6; // Next claim will be day 7

  return (
    <Card className="glass-card mb-6 border-base-blue/20">
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-base flex items-center gap-2">
                {isWeeklyReward ? (
                  <>
                    <Flame className="w-5 h-5 text-orange-500" />
                    <span>Weekly Reward Ready!</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <span>Daily XP Claim</span>
                  </>
                )}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {isWeeklyReward
                  ? "Complete your streak for 50 XP!"
                  : "Claim 10 XP every 24 hours"}
              </p>
            </div>
          </div>

          {/* Streak Calendar */}
          <StreakCalendar
            streakCount={streakCount}
            lastClaimDate={lastClaimDate}
          />

          {/* Claim Button */}
          <div className="pt-2">
            {canClaim ? (
              <GlowButton
                onClick={handleClaim}
                disabled={claiming}
                className="w-full"
                size="lg"
              >
                {claiming ? (
                  "Claiming..."
                ) : isWeeklyReward ? (
                  <>
                    <Flame className="w-4 h-4 mr-2" />
                    Claim 50 XP
                  </>
                ) : (
                  "Claim 10 XP"
                )}
              </GlowButton>
            ) : (
              <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-white/5 border border-white/10">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Available in {countdown.hours}h {countdown.minutes}m
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

