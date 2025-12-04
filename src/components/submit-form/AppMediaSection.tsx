"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link as LinkIcon, Image as ImageIcon } from "lucide-react";
import Image from "next/image";

interface AppMediaSectionProps {
  iconUrl: string;
  headerImageUrl: string;
  onIconUrlChange: (value: string) => void;
  onHeaderImageUrlChange: (value: string) => void;
}

export default function AppMediaSection({
  iconUrl,
  headerImageUrl,
  onIconUrlChange,
  onHeaderImageUrlChange,
}: AppMediaSectionProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
          <span>🖼️</span> APP MEDIA
        </h3>
        <p className="text-xs text-white/50 mb-4">Icons and banners for your app</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="iconUrl" className="text-xs font-semibold text-white/80 flex items-center gap-1.5">
            <span>🖼️</span> Icon URL <span className="text-white/40 text-[10px]">(Optional)</span>
          </Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <Input
                id="iconUrl"
                type="url"
                placeholder="Enter icon URL..."
                value={iconUrl}
                onChange={(e) => onIconUrlChange(e.target.value)}
                className="pl-10 h-12 bg-[#0f0f15] border-transparent focus:border-purple-500/50 rounded-xl"
              />
            </div>
            {iconUrl && (
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/5 border border-white/10 flex-shrink-0">
                <Image
                  src={iconUrl}
                  alt="Icon preview"
                  width={48}
                  height={48}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "/placeholder.svg";
                  }}
                />
              </div>
            )}
            {!iconUrl && (
              <div className="w-12 h-12 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                <LinkIcon className="w-5 h-5 text-white/20" />
              </div>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="headerImageUrl" className="text-xs font-semibold text-white/80 flex items-center gap-1.5">
            <span>🎨</span> Banner Image URL <span className="text-white/40 text-[10px]">(Optional)</span>
          </Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <Input
                id="headerImageUrl"
                type="url"
                placeholder="Enter banner URL..."
                value={headerImageUrl}
                onChange={(e) => onHeaderImageUrlChange(e.target.value)}
                className="pl-10 h-12 bg-[#0f0f15] border-transparent focus:border-purple-500/50 rounded-xl"
              />
            </div>
            {headerImageUrl && (
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/5 border border-white/10 flex-shrink-0">
                <Image
                  src={headerImageUrl}
                  alt="Banner preview"
                  width={48}
                  height={48}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "/placeholder.svg";
                  }}
                />
              </div>
            )}
            {!headerImageUrl && (
              <div className="w-12 h-12 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                <ImageIcon className="w-5 h-5 text-white/20" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

