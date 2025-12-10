import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare } from "lucide-react";
import { useState, useEffect } from "react";
import { getOptimizedImageUrl } from "@/lib/image-optimizer";

interface CastCardProps {
  cast: {
    id: string;
    authorName?: string;
    authorHandle?: string;
    authorAvatar?: string;
    content: string;
    mediaUrl?: string;
    createdAt: string;
  };
}

export function CastCard({ cast }: CastCardProps) {
  const [optimizedAvatar, setOptimizedAvatar] = useState<string | null>(cast.authorAvatar || null);
  const [optimizedMedia, setOptimizedMedia] = useState<string | null>(cast.mediaUrl || null);

  useEffect(() => {
    // Optimize avatar
    if (cast.authorAvatar) {
      getOptimizedImageUrl(cast.authorAvatar).then(setOptimizedAvatar);
    }
    
    // Optimize media
    if (cast.mediaUrl) {
      getOptimizedImageUrl(cast.mediaUrl).then(setOptimizedMedia);
    }
  }, [cast.authorAvatar, cast.mediaUrl]);

  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-white/10 shadow-lg hover:shadow-xl hover:border-base-blue/30 transition-all duration-300 flex flex-col min-w-[300px] w-[300px]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        {optimizedAvatar ? (
          <Image
            src={optimizedAvatar}
            alt={cast.authorName || cast.authorHandle || "Author"}
            width={40}
            height={40}
            className="rounded-full flex-shrink-0"
            quality={75}
            loading="lazy"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-base-blue/20 flex items-center justify-center flex-shrink-0">
            <MessageSquare className="w-5 h-5 text-base-blue" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          {cast.authorName && (
            <p className="text-sm font-semibold text-white whitespace-normal break-words">
              {cast.authorName}
            </p>
          )}
          {cast.authorHandle && (
            <p className="text-xs text-gray-400 whitespace-normal break-words">
              {cast.authorHandle}
            </p>
          )}
        </div>
        <MessageSquare className="w-4 h-4 text-base-blue flex-shrink-0" />
      </div>

      {/* Content */}
      <p className="text-sm text-gray-200 mb-3 whitespace-normal break-words overflow-wrap-anywhere">
        {cast.content}
      </p>

      {/* Media */}
      {optimizedMedia && (
        <div className="w-full mt-2 mb-3 rounded-xl overflow-hidden">
          <Image
            src={optimizedMedia}
            alt="Cast media"
            width={300}
            height={200}
            className="w-full h-auto object-contain rounded-xl"
            loading="lazy"
            quality={80}
            sizes="(max-width: 768px) 100vw, 300px"
          />
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto pt-2 border-t border-white/10">
        <p className="text-xs text-gray-500">
          {formatDistanceToNow(new Date(cast.createdAt), {
            addSuffix: true,
          })}
        </p>
        <span className="text-xs px-2 py-1 rounded-full bg-base-blue/10 text-base-blue">
          Base
        </span>
      </div>
    </div>
  );
}

