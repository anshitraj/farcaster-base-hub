"use client";

import { useState, useEffect } from "react";
import { Bookmark } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { ToastAction } from "@/components/ui/toast";

interface FavoriteButtonProps {
  appId: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export default function FavoriteButton({ appId, className = "", size = "md" }: FavoriteButtonProps) {
  const [isFavorited, setIsFavorited] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { toast } = useToast();
  const { isAuthenticated, loading: authLoading } = useAuth();

  // Detect mobile to reduce animations
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  useEffect(() => {
    // Don't fetch if not authenticated or still checking auth
    if (authLoading || !isAuthenticated) {
      setIsFavorited(false);
      setLoading(false);
      return;
    }

    let mounted = true;

    async function checkFavoriteStatus() {
      try {
        const res = await fetch(`/api/collections/items?miniAppId=${appId}&type=favorites`, {
          credentials: "include",
        });
        
        if (!mounted) return;

        if (res.ok) {
          const data = await res.json();
          setIsFavorited(data.isFavorited || false);
        } else if (res.status === 401) {
          // User is not authenticated, set to false
          setIsFavorited(false);
        }
      } catch (error) {
        if (!mounted) return;
        console.error("Error checking favorite status:", error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    if (appId) {
      checkFavoriteStatus();
    }

    // Listen for auth changes
    const handleWalletDisconnect = () => {
      if (mounted) {
        setIsFavorited(false);
        setLoading(false);
      }
    };

    window.addEventListener("walletDisconnected", handleWalletDisconnect);

    return () => {
      mounted = false;
      window.removeEventListener("walletDisconnected", handleWalletDisconnect);
    };
  }, [appId, isAuthenticated, authLoading]);

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isToggling || loading || !isAuthenticated) {
      if (!isAuthenticated) {
        toast({
          title: "Authentication required",
          description: "Please connect your wallet to save apps",
          variant: "destructive",
        });
      }
      return;
    }

    // Optimistic update - update UI immediately
    const previousState = isFavorited;
    const newState = !isFavorited;
    setIsFavorited(newState);
    setIsToggling(true);

    // Show notification immediately (optimistic)
    if (newState) {
      // Adding to favorites
      toast({
        title: "Added to saved apps",
        description: "App saved to your list",
        action: (
          <ToastAction altText="View saved apps" asChild>
            <Link href="/favourites" className="text-blue-400 hover:text-blue-300 font-medium">
              Saved Apps
            </Link>
          </ToastAction>
        ),
      });
    } else {
      // Removing from favorites
      toast({
        title: "Removed from saved",
        description: "App removed from your saved list",
      });
    }

    try {
      if (previousState) {
        // Remove from favorites
        const res = await fetch(`/api/collections/items?miniAppId=${appId}&type=favorites`, {
          method: "DELETE",
          credentials: "include",
        });

        if (!res.ok && res.status !== 401) {
          // Revert optimistic update on error (but not on 401, as that's handled below)
          setIsFavorited(previousState);
          throw new Error("Failed to remove from favorites");
        } else if (res.status === 401) {
          // Revert optimistic update
          setIsFavorited(previousState);
          toast({
            title: "Authentication required",
            description: "Please connect your wallet",
            variant: "destructive",
          });
        }
      } else {
        // Add to favorites
        const res = await fetch("/api/collections/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            miniAppId: appId,
            collectionType: "favorites",
          }),
        });

        if (!res.ok && res.status !== 401) {
          const errorData = await res.json().catch(() => ({}));
          if (errorData.error?.includes("already")) {
            // Already favorited, keep optimistic state
            setIsFavorited(true);
          } else {
            // Revert optimistic update
            setIsFavorited(previousState);
            throw new Error(errorData.error || "Failed to save app");
          }
        } else if (res.status === 401) {
          // Revert optimistic update
          setIsFavorited(previousState);
          toast({
            title: "Authentication required",
            description: "Please connect your wallet",
            variant: "destructive",
          });
        }
      }
    } catch (error: any) {
      // Revert optimistic update on error
      setIsFavorited(previousState);
      console.error("Error toggling favorite:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update saved list",
        variant: "destructive",
      });
    } finally {
      setIsToggling(false);
    }
  };

  // Show button immediately with default state instead of loading spinner
  // This prevents blocking UI while checking favorite status
  if (loading) {
    return (
      <button
        onClick={toggleFavorite}
        className={`${className} transition-all duration-100 flex items-center gap-1.5 touch-manipulation opacity-60`}
        aria-label="Save"
        style={{ WebkitTapHighlightColor: 'transparent' }}
        disabled
      >
        <Bookmark className={`${sizeClasses[size]} text-gray-400`} />
        <span className="text-xs text-gray-400">Save</span>
      </button>
    );
  }

  return (
    <motion.button
      whileHover={isMobile ? {} : { scale: 1.05 }}
      whileTap={isMobile ? {} : { scale: 0.95 }}
      onClick={toggleFavorite}
      className={`${className} transition-all duration-100 flex items-center gap-1.5 touch-manipulation`}
      aria-label={isFavorited ? "Remove from saved" : "Save"}
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      <Bookmark
        className={`${sizeClasses[size]} transition-all duration-100 ${
          isFavorited
            ? "text-yellow-400 fill-yellow-400"
            : "text-gray-400 hover:text-yellow-400"
        }`}
      />
      <span className="text-xs text-gray-400 hover:text-gray-300 transition-colors duration-100">
        Save
      </span>
    </motion.button>
  );
}

