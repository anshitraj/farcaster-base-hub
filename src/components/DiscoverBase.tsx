"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { SectionTitle } from "./SectionTitle";

interface BaseDiscoverPost {
  id: string;
  imageUrl: string;
  redirectUrl: string;
  createdAt: string;
}

export function DiscoverBase() {
  const [posts, setPosts] = useState<BaseDiscoverPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPosts() {
      try {
        const res = await fetch("/api/base-discover/list", {
          credentials: "include",
          cache: "no-store", // Force fresh data
        });

        if (!res.ok) {
          console.error("Failed to fetch Base Discover posts:", res.status);
          return;
        }

        const data = await res.json();
        console.log("DiscoverBase fetched posts:", data);
        setPosts(data.posts || []);
      } catch (error) {
        console.error("Error fetching Base Discover posts:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchPosts();
  }, []);

  if (loading) {
    return (
      <div className="mb-16 mt-10">
        <SectionTitle 
          title="Discover Base" 
          subtitle="Featured content from the Base ecosystem" 
        />
        <div className="flex gap-4 overflow-x-auto pb-4 px-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-[280px] h-[200px] bg-gray-900 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (posts.length === 0) {
    return null; // Don't show section if no posts
  }

  const handleCardClick = (redirectUrl: string) => {
    window.open(redirectUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="mb-16 mt-10">
      <SectionTitle 
        title="Discover Base" 
        subtitle="Featured content from the Base ecosystem" 
      />
      
      <div className="overflow-x-auto scroll-smooth no-scrollbar pb-2">
        <div className="flex gap-4 px-4 min-w-max">
          {posts.map((post) => (
            <motion.div
              key={post.id}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.1 }}
              className="flex-shrink-0 cursor-pointer touch-manipulation"
              onClick={() => handleCardClick(post.redirectUrl)}
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <div className="relative w-[280px] sm:w-[320px] aspect-[3/4] rounded-2xl border border-[#1A1F2E] hover:border-[#2A2F3E] transition-all duration-200 overflow-hidden group bg-black">
                <Image
                  src={post.imageUrl}
                  alt="Discover Base"
                  fill
                  className="object-contain group-hover:scale-105 transition-transform duration-200"
                  sizes="(max-width: 640px) 280px, 320px"
                  loading="lazy"
                  quality={85}
                />
                {/* Subtle overlay on hover */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-200" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

