"use client";

import { useState, useEffect } from "react";
import { Heart } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

interface FavoriteButtonProps {
  appId: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export default function FavoriteButton({ appId, className = "", size = "md" }: FavoriteButtonProps) {
  const [isFavorited, setIsFavorited] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  const { toast } = useToast();
  const { isAuthenticated, loading: authLoading } = useAuth();

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
          description: "Please connect your wallet to add favorites",
          variant: "destructive",
        });
      }
      return;
    }

    setIsToggling(true);

    try {
      if (isFavorited) {
        // Remove from favorites
        const res = await fetch(`/api/collections/items?miniAppId=${appId}&type=favorites`, {
          method: "DELETE",
          credentials: "include",
        });

        if (res.ok) {
          setIsFavorited(false);
          toast({
            title: "Removed from favorites",
            description: "App removed from your favorites",
          });
        } else if (res.status === 401) {
          toast({
            title: "Authentication required",
            description: "Please connect your wallet",
            variant: "destructive",
          });
        } else {
          throw new Error("Failed to remove from favorites");
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

        if (res.ok) {
          setIsFavorited(true);
          toast({
            title: "Added to favorites",
            description: "App added to your favorites",
          });
        } else if (res.status === 401) {
          toast({
            title: "Authentication required",
            description: "Please connect your wallet",
            variant: "destructive",
          });
        } else {
          const errorData = await res.json().catch(() => ({}));
          if (errorData.error?.includes("already")) {
            setIsFavorited(true);
          } else {
            throw new Error(errorData.error || "Failed to add to favorites");
          }
        }
      }
    } catch (error: any) {
      console.error("Error toggling favorite:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update favorites",
        variant: "destructive",
      });
    } finally {
      setIsToggling(false);
    }
  };

  if (loading) {
    return (
      <div className={`${sizeClasses[size]} rounded-full bg-gray-800 animate-pulse ${className}`} />
    );
  }

  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={toggleFavorite}
      className={`${className} transition-all duration-300`}
      aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
    >
      <Heart
        className={`${sizeClasses[size]} transition-all duration-300 ${
          isFavorited
            ? "text-red-500 fill-red-500"
            : "text-gray-400 hover:text-red-400"
        }`}
      />
    </motion.button>
  );
}

