"use client";

import { Lock, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PremiumLockedOverlayProps {
  onSubscribe?: () => void;
}

export default function PremiumLockedOverlay({ onSubscribe }: PremiumLockedOverlayProps) {
  return (
    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm rounded-2xl flex items-center justify-center z-20">
      <div className="text-center p-6 max-w-sm">
        <div className="bg-gradient-to-br from-purple-600/20 to-base-blue/20 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
          <Lock className="w-8 h-8 text-purple-400" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">Premium Content</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Subscribe to Premium to unlock exclusive apps & benefits.
        </p>
        <Button
          className="bg-gradient-to-r from-purple-600 to-base-blue hover:from-purple-700 hover:to-base-blue/90 text-white"
          onClick={() => {
            if (onSubscribe) {
              onSubscribe();
            } else {
              window.location.href = "/premium?subscribe=true";
            }
          }}
        >
          <Crown className="w-4 h-4 mr-2" />
          Unlock Premium
        </Button>
      </div>
    </div>
  );
}

