"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";

interface Promo {
  id: string;
  title: string;
  imageUrl: string;
  redirectUrl: string;
  appId?: string | null;
  priority: number;
}

export default function PromoSection() {
  const [promos, setPromos] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissedPromos, setDismissedPromos] = useState<string[]>([]);

  useEffect(() => {
    async function fetchPromos() {
      try {
        const res = await fetch("/api/promos");
        if (res.ok) {
          const data = await res.json();
          setPromos(data.promos || []);
        }
      } catch (error) {
        console.error("Error fetching promos:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchPromos();

    // Load dismissed promos from localStorage
    if (typeof window !== "undefined") {
      const dismissed = localStorage.getItem("dismissedPromos");
      if (dismissed) {
        try {
          setDismissedPromos(JSON.parse(dismissed));
        } catch (e) {
          console.error("Error parsing dismissed promos:", e);
        }
      }
    }
  }, []);

  const handleDismiss = (promoId: string) => {
    setDismissedPromos((prev) => {
      const updated = [...prev, promoId];
      if (typeof window !== "undefined") {
        localStorage.setItem("dismissedPromos", JSON.stringify(updated));
      }
      return updated;
    });
  };

  const handleClick = async (promo: Promo) => {
    // Track click
    try {
      await fetch(`/api/promos/${promo.id}/click`, { method: "PATCH" });
    } catch (error) {
      console.error("Error tracking click:", error);
    }
  };

  const visiblePromos = promos.filter((promo) => !dismissedPromos.includes(promo.id));

  if (loading || visiblePromos.length === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      <h2 className="text-xl font-bold mb-4">Featured Promotions</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {visiblePromos.map((promo, index) => (
          <motion.div
            key={promo.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className="relative group"
          >
            <Link
              href={promo.redirectUrl}
              onClick={() => handleClick(promo)}
              className="block relative rounded-xl overflow-hidden bg-[#141A24] border border-[#1F2733] hover:border-[#2A2A2A] transition-all hover:scale-[1.02]"
            >
              <div className="relative aspect-video w-full">
                <Image
                  src={promo.imageUrl}
                  alt={promo.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="text-white font-semibold text-sm line-clamp-2">
                    {promo.title}
                  </h3>
                </div>
              </div>
            </Link>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleDismiss(promo.id);
              }}
              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition-colors z-10"
              aria-label="Dismiss promo"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}






