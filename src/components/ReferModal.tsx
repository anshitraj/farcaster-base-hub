"use client";

import { useState, useEffect } from "react";
import { X, Share2, Copy, Rocket } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { sdk } from "@farcaster/miniapp-sdk";
import { useToast } from "@/hooks/use-toast";
import { getBaseDeepLink } from "@/lib/baseDeepLink";

interface ReferModalProps {
  isOpen: boolean;
  onClose: () => void;
  referralCount?: number;
  onReferralCountUpdate?: () => void;
}

export default function ReferModal({ isOpen, onClose, referralCount = 0, onReferralCountUpdate }: ReferModalProps) {
  const [referralUrl, setReferralUrl] = useState<string>("");
  const [fid, setFid] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    async function getFid() {
      try {
        const isMini = await sdk.isInMiniApp();
        if (isMini) {
          const context = await sdk.context;
          if (context?.user?.fid) {
            const userFid = String(context.user.fid);
            setFid(userFid);
            const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
            setReferralUrl(`${baseUrl}/quests?ref=${userFid}`);
          }
        } else {
          // Fallback: try to get from auth
          try {
            const res = await fetch("/api/auth/wallet", {
              credentials: "include",
            });
            if (res.ok) {
              const data = await res.json();
              if (data.fid) {
                const userFid = String(data.fid);
                setFid(userFid);
                const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
                setReferralUrl(`${baseUrl}/quests?ref=${userFid}`);
              }
            }
          } catch (error) {
            console.error("Error fetching FID:", error);
          }
        }
      } catch (error) {
        console.error("Error getting FID:", error);
      }
    }

    if (isOpen) {
      getFid();
    }
  }, [isOpen]);

  const handleShareToFarcaster = async () => {
    if (!referralUrl || !fid) {
      toast({
        title: "Error",
        description: "Unable to generate referral link. Please try again.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const isMini = await sdk.isInMiniApp();
      if (isMini) {
        await sdk.actions.composeCast({
          text: "Join this quest with me! 🚀",
          embeds: [referralUrl],
        });
        toast({
          title: "Success",
          description: "Opening Farcaster composer...",
        });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(referralUrl);
        toast({
          title: "Link Copied",
          description: "Referral link copied to clipboard!",
        });
      }
    } catch (error) {
      console.error("Error sharing to Farcaster:", error);
      toast({
        title: "Error",
        description: "Failed to open Farcaster composer. Try copying the link instead.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleShareToBase = async () => {
    if (!referralUrl) {
      toast({
        title: "Error",
        description: "Unable to generate referral link. Please try again.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const baseDeepLink = getBaseDeepLink(referralUrl);
      
      // Try to open Base app
      if (typeof window !== "undefined") {
        window.location.href = baseDeepLink;
        
        // Fallback: copy to clipboard if Base app doesn't open
        setTimeout(async () => {
          try {
            await navigator.clipboard.writeText(referralUrl);
            toast({
              title: "Link Copied",
              description: "Referral link copied to clipboard!",
            });
          } catch (error) {
            // Ignore clipboard errors
          }
        }, 1000);
      }
    } catch (error) {
      console.error("Error sharing to Base:", error);
      toast({
        title: "Error",
        description: "Failed to open Base app. Try copying the link instead.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!referralUrl) {
      toast({
        title: "Error",
        description: "No referral link available.",
        variant: "destructive",
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(referralUrl);
      toast({
        title: "Link Copied",
        description: "Referral link copied to clipboard!",
      });
    } catch (error) {
      console.error("Error copying link:", error);
      toast({
        title: "Error",
        description: "Failed to copy link. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="relative w-full max-w-md bg-[#0B0F19] border border-base-cyan/30 rounded-2xl overflow-hidden"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-gray-800/50 hover:bg-gray-700/50 transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>

          {/* Gradient Header */}
          <div className="relative h-48 bg-gradient-to-br from-purple-600/30 via-blue-600/30 to-cyan-600/30 overflow-hidden">
            {/* Pattern Overlay */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0" style={{
                backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)`,
              }} />
            </div>
            
            {/* Rocket Icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <Rocket className="w-24 h-24 text-white" />
              </motion.div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 bg-white">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-black mb-2">Refer Friends</h2>
              <p className="text-gray-600">Gaming is better with friends!</p>
              {referralCount > 0 && (
                <p className="text-sm text-gray-500 mt-2">
                  {referralCount} {referralCount === 1 ? "friend has" : "friends have"} joined!
                </p>
              )}
            </div>

            {/* Share Buttons */}
            <div className="flex flex-col gap-3 mb-4">
              <div className="flex gap-3">
                <button
                  onClick={handleShareToFarcaster}
                  disabled={isLoading || !referralUrl}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Share2 className="w-5 h-5" />
                  Share to Farcaster
                </button>
                <button
                  onClick={handleShareToBase}
                  disabled={isLoading || !referralUrl}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#0052FF] hover:bg-[#0040CC] text-white px-6 py-3 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Share2 className="w-5 h-5" />
                  Share to Base
                </button>
              </div>
              <button
                onClick={handleCopyLink}
                disabled={!referralUrl}
                className="w-full flex items-center justify-center gap-2 bg-black hover:bg-gray-900 text-white px-6 py-3 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Copy className="w-5 h-5" />
                Copy Link
              </button>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-full px-5 py-2.5 bg-gray-200 hover:bg-gray-300 text-black rounded-xl font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

