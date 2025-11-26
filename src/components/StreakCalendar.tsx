"use client";

import { CheckCircle2, Circle } from "lucide-react";
import { motion } from "framer-motion";

interface StreakCalendarProps {
  streakCount: number;
  lastClaimDate: Date | null;
}

export default function StreakCalendar({
  streakCount,
  lastClaimDate,
}: StreakCalendarProps) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const today = new Date().getDay();
  
  // Determine which days have been claimed
  const getDayStatus = (dayIndex: number) => {
    if (dayIndex < streakCount) {
      return "claimed";
    } else if (dayIndex === streakCount) {
      return "current";
    } else {
      return "upcoming";
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">7-Day Streak</h3>
      <div className="flex items-center justify-between gap-2">
        {days.map((day, index) => {
          const status = getDayStatus(index);
          const isDay7 = index === 6;
          
          return (
            <motion.div
              key={day}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="flex flex-col items-center gap-1.5 flex-1"
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                  status === "claimed"
                    ? "bg-green-500/20 border-green-500 text-green-400"
                    : status === "current"
                    ? "bg-base-blue/20 border-base-blue text-base-blue ring-2 ring-base-blue/50"
                    : isDay7
                    ? "bg-purple-500/10 border-purple-500/30 text-muted-foreground"
                    : "bg-white/5 border-white/10 text-muted-foreground"
                }`}
              >
                {status === "claimed" ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <span className="text-xs font-semibold">{index + 1}</span>
                )}
              </div>
              <span
                className={`text-[10px] font-medium ${
                  status === "current"
                    ? "text-base-blue"
                    : status === "claimed"
                    ? "text-green-400"
                    : "text-muted-foreground"
                }`}
              >
                {day}
              </span>
              {isDay7 && (
                <span className="text-[9px] text-purple-400 font-semibold">
                  +50 XP
                </span>
              )}
            </motion.div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground text-center pt-2">
        {streakCount === 0
          ? "Start your streak today!"
          : streakCount < 7
          ? `${streakCount} day${streakCount > 1 ? "s" : ""} in a row!`
          : "Complete the week for 50 XP!"}
      </p>
    </div>
  );
}

