"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Star, Users, ExternalLink, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import RatingStars from "./RatingStars";
import VerifiedBadge from "./VerifiedBadge";
import UnverifiedBadge from "./UnverifiedBadge";
import Top30Badge from "./Top30Badge";
import AutoUpdateBadge from "./AutoUpdateBadge";
import RankBadge from "./RankBadge";
import SecuredBadge from "./SecuredBadge";
import FavoriteButton from "./FavoriteButton";
import { optimizeDevImage } from "@/utils/optimizeDevImage";

interface AppCardProps {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  category: string;
  ratingAverage?: number;
  ratingCount?: number;
  installs?: number;
  clicks?: number;
  featured?: boolean;
  developer?: {
    name?: string;
    wallet?: string;
    verified?: boolean;
  };
  verified?: boolean;
  topBaseRank?: number | null;
  autoUpdated?: boolean;
  rank?: number; // Overall app rank
  variant?: "horizontal" | "grid" | "featured";
  url?: string; // Main app URL
  farcasterUrl?: string; // Farcaster mini app URL
  baseMiniAppUrl?: string; // Base mini app URL
  tags?: string[]; // App tags for display
}

const AppCard = ({
  id,
  name,
  description,
  iconUrl,
  category,
  ratingAverage = 0,
  ratingCount = 0,
  installs = 0,
  featured,
  developer,
  verified = false,
  topBaseRank = null,
  autoUpdated = false,
  rank,
  variant = "horizontal",
  url,
  farcasterUrl,
  baseMiniAppUrl,
  tags = [],
}: AppCardProps) => {
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  if (!id) {
    return null;
  }

  const handleCardClick = useCallback(() => {
    router.push(`/apps/${id}`);
  }, [router, id]);

  // Mobile horizontal card (default) - Play Store style
  if (variant === "horizontal") {
    // Format tags for display (e.g., "Games • Spin • Win")
    const formattedTags = tags && tags.length > 0 
      ? tags.slice(0, 4).map(tag => tag.charAt(0).toUpperCase() + tag.slice(1)).join(" • ")
      : category;

    return (
      <div className="block min-w-[280px]">
        <motion.div
          whileTap={isMobile ? {} : { scale: 0.98 }}
          transition={{ duration: 0.1 }}
        >
          <Card 
            className="card-surface hover-glow transition-all duration-100 h-full border-[hsl(var(--border))] cursor-pointer rounded-xl touch-manipulation"
            onClick={handleCardClick}
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                {/* Logo - Large and dominant on the left */}
                {iconUrl && (
                  <div className="flex-shrink-0">
                    <Image
                      src={optimizeDevImage(iconUrl)}
                      alt={name}
                      width={64}
                      height={64}
                      className="w-16 h-16 rounded-xl bg-background-secondary shadow-lg"
                      loading={featured ? "eager" : "lazy"}
                      fetchPriority={featured ? "high" : "auto"}
                      placeholder="blur"
                      blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjMTIxMjEyIi8+PC9zdmc+"
                      data-original={iconUrl}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        const originalUrl = target.getAttribute("data-original");
                        if (originalUrl) {
                          target.src = originalUrl;
                        } else {
                          target.src = "/placeholder.svg";
                        }
                      }}
                    />
                  </div>
                )}

                {/* Content - Right side with proper hierarchy */}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  {/* Line 1: App Name + Verified Checkmark (White) */}
                  <div className="flex items-center gap-1.5 mb-1">
                    <h3 className="font-bold text-base text-white truncate uppercase">
                      {name}
                    </h3>
                    {verified && (
                      <svg
                        viewBox="0 0 22 22"
                        width={16}
                        height={16}
                        className="w-4 h-4 flex-shrink-0"
                        title="Verified App"
                        xmlns="http://www.w3.org/2000/svg"
                        style={{ display: 'inline-block' }}
                      >
                        <path
                          d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z"
                          fill="#1d9bf0"
                          style={{ fill: '#1d9bf0' }}
                        />
                      </svg>
                    )}
                  </div>

                  {/* Line 2: Category Tags - Muted color #A4A4A4 */}
                  <p className="text-xs mb-1.5 truncate" style={{ color: '#A4A4A4' }}>
                    {formattedTags}
                  </p>

                  {/* Line 3: Short Description - Single line with ellipsis */}
                  <p className="text-sm text-gray-300 mb-1.5 truncate leading-snug">
                    {description}
                  </p>

                  {/* Line 4: Rating Row - Yellow star BEFORE number, Save button on right */}
                  <div className="flex items-center justify-between">
                    {ratingCount > 0 && ratingAverage > 0 ? (
                      <div className="flex items-center gap-1.5">
                        <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm text-white font-medium">
                          {ratingAverage % 1 === 0 ? ratingAverage.toString() : ratingAverage.toFixed(1)}
                        </span>
                      </div>
                    ) : (
                      <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full text-[10px] font-medium border border-green-500/30">
                        New
                      </span>
                    )}
                    
                    {/* Save button - Below rating, aligned right */}
                    <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      <FavoriteButton appId={id} size="sm" />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Featured card (larger)
  if (variant === "featured") {
    return (
      <div className="block">
        <motion.div
          whileTap={isMobile ? {} : { scale: 0.98 }}
          transition={{ duration: 0.1 }}
        >
          <Card 
            className="card-surface hover-glow transition-all duration-100 overflow-hidden border-base-blue/30 cursor-pointer touch-manipulation"
            style={{ WebkitTapHighlightColor: 'transparent' }}
            onClick={handleCardClick}
          >
            <CardContent className="p-0">
              <div className="relative">
                {/* Hero Image/Icon Section */}
                {iconUrl && (
                  <div className="w-full h-40 bg-gradient-to-br from-base-blue/30 via-base-cyan/20 to-purple-500/20 flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F19] via-transparent to-transparent z-10" />
                    <Image
                      src={optimizeDevImage(iconUrl)}
                      alt={name}
                      width={100}
                      height={100}
                      className="w-24 h-24 rounded-2xl shadow-2xl z-20 relative"
                      loading="eager"
                      fetchPriority="high"
                      data-original={iconUrl}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        const originalUrl = target.getAttribute("data-original");
                        if (originalUrl) {
                          target.src = originalUrl;
                        } else {
                          target.src = "/placeholder.svg";
                        }
                      }}
                    />
                  </div>
                )}
                
                {/* Content Section */}
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <div className="flex items-center gap-1">
                          <h3 className="font-bold text-xl truncate">{name}</h3>
                          {verified && (
                            <svg
                              viewBox="0 0 22 22"
                              width={20}
                              height={20}
                              className="w-5 h-5 flex-shrink-0 ml-0.5"
                              title="Verified App"
                              xmlns="http://www.w3.org/2000/svg"
                              style={{ display: 'inline-block' }}
                            >
                              <path
                                d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z"
                                fill="#1d9bf0"
                                style={{ fill: '#1d9bf0' }}
                              />
                            </svg>
                          )}
                        </div>
                        {rank && (
                          <RankBadge rank={rank} size="md" className="flex-shrink-0" />
                        )}
                        {topBaseRank && (
                          <Top30Badge rank={topBaseRank} className="flex-shrink-0" />
                        )}
                        {autoUpdated && (
                          <AutoUpdateBadge className="flex-shrink-0" />
                        )}
                      </div>
                      {developer && (
                        <div className="flex items-center gap-1.5 mb-2">
                          <p className="text-sm text-muted-foreground">
                            by {developer.name || "Anonymous Developer"}
                          </p>
                          {developer.verified && (
                            <VerifiedBadge type="developer" iconOnly size="sm" />
                          )}
                        </div>
                      )}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs bg-base-blue/20 text-base-blue px-2 py-1 rounded-full">
                          {category}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Description */}
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-3 leading-relaxed">
                    {description}
                  </p>
                  
                  {/* Stats and CTA */}
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="flex items-center gap-1">
                        <RatingStars rating={ratingAverage} ratingCount={ratingCount} size={14} showNumber />
                        {ratingCount > 0 && (
                          <span className="text-xs text-muted-foreground ml-1">
                            ({ratingCount})
                          </span>
                        )}
                        {ratingCount === 0 && (
                          <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full text-[10px] font-medium border border-green-500/30 ml-2">
                            New
                          </span>
                        )}
                      </div>
                      {installs > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {installs.toLocaleString()} installs
                        </span>
                      )}
                    </div>
                    <Link
                      href={`/apps/${id}`}
                      className="bg-base-blue hover:bg-base-blue/90 text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition-colors flex-shrink-0"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open
                    </Link>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Grid card (desktop)
  return (
    <div className="block">
      <motion.div
        whileHover={isMobile ? {} : { scale: 1.02 }}
        whileTap={isMobile ? {} : { scale: 0.98 }}
        transition={{ duration: 0.1 }}
      >
        <Card 
            className="card-surface hover-glow transition-all duration-100 h-full border-[hsl(var(--border))] cursor-pointer touch-manipulation"
            style={{ WebkitTapHighlightColor: 'transparent' }}
            onClick={handleCardClick}
          >
          <CardContent className="p-4">
            <div className="flex flex-col items-center text-center mb-4">
              {iconUrl && (
                <Image
                  src={optimizeDevImage(iconUrl)}
                  alt={name}
                  width={80}
                  height={80}
                  className="w-20 h-20 rounded-xl bg-background-secondary p-2 shadow-lg mb-3"
                  data-original={iconUrl}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    const originalUrl = target.getAttribute("data-original");
                    if (originalUrl) {
                      target.src = originalUrl;
                    } else {
                      target.src = "/placeholder.svg";
                    }
                  }}
                />
              )}
              <div className="flex items-center gap-2 mb-1 flex-wrap justify-center">
                <div className="flex items-center gap-1">
                  <h3 className="font-semibold text-base">{name}</h3>
                  {verified && (
                    <svg
                      viewBox="0 0 22 22"
                      width={18}
                      height={18}
                      className="w-[18px] h-[18px] flex-shrink-0 ml-0.5"
                      title="Verified App"
                      xmlns="http://www.w3.org/2000/svg"
                      style={{ display: 'inline-block' }}
                    >
                      <path
                        d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z"
                        fill="#1d9bf0"
                        style={{ fill: '#1d9bf0' }}
                      />
                    </svg>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-2">{category}</p>
            </div>

            <p className="text-sm text-muted-foreground mb-4 line-clamp-2 text-center">
              {description}
            </p>

            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <RatingStars rating={ratingAverage} ratingCount={ratingCount} size={12} />
              {ratingCount === 0 && (
                <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full text-[10px] font-medium border border-green-500/30 ml-2">
                  New
                </span>
              )}
              {installs > 0 && (
                <span>{installs} installs</span>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default AppCard;
