"use client";

import { useState, useEffect } from "react";
import { Crown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import PremiumBadge from "./PremiumBadge";

export default function PremiumSubscriptionBanner() {
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkPremium() {
      try {
        const res = await fetch("/api/premium/status", {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setIsPremium(data.isPremium);
        }
      } catch (error) {
        console.error("Error checking premium status:", error);
      } finally {
        setLoading(false);
      }
    }
    checkPremium();
  }, []);

  if (loading) return null;

  if (isPremium) {
    return (
      <div className="bg-gradient-to-r from-purple-600/20 via-base-blue/20 to-purple-600/20 border border-purple-500/50 rounded-2xl p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-purple-500 to-base-blue p-2 rounded-xl">
              <Crown className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-white">Premium Active</h3>
                <PremiumBadge size="sm" />
              </div>
              <p className="text-xs text-muted-foreground">
                Enjoy all premium features and perks
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-purple-600/20 via-base-blue/20 to-purple-600/20 border border-purple-500/50 rounded-2xl p-6 mb-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-base-blue/10" />
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="w-6 h-6 text-purple-400" />
              <h2 className="text-xl font-bold text-white">Mini App Store Premium</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Unlock exclusive features, analytics, perks & curated premium apps.
            </p>
            <div className="flex items-center gap-4 mb-4">
              <div className="text-2xl font-bold text-white">$5.99</div>
              <div className="text-sm text-muted-foreground">/ month</div>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground mb-4">
              <li className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>+10% XP multiplier on app launches</span>
              </li>
              <li className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>Premium analytics & insights</span>
              </li>
              <li className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>1 Monthly Boost credit</span>
              </li>
              <li className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>Early access to new apps</span>
              </li>
            </ul>
          </div>
        </div>
        <Button
          className="w-full bg-gradient-to-r from-purple-600 to-base-blue hover:from-purple-700 hover:to-base-blue/90 text-white font-semibold"
          onClick={() => {
            // Handle subscription - redirect to payment flow
            window.location.href = "/premium?subscribe=true";
          }}
        >
          <Crown className="w-4 h-4 mr-2" />
          Subscribe Now
        </Button>
      </div>
    </div>
  );
}

