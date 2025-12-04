"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Globe, Loader2 } from "lucide-react";

interface AppUrlsSectionProps {
  url: string;
  baseMiniAppUrl: string;
  farcasterUrl: string;
  onUrlChange: (value: string) => void;
  onBaseMiniAppUrlChange: (value: string) => void;
  onFarcasterUrlChange: (value: string) => void;
  onFetchDetails: () => void;
  fetching: boolean;
}

export default function AppUrlsSection({
  url,
  baseMiniAppUrl,
  farcasterUrl,
  onUrlChange,
  onBaseMiniAppUrlChange,
  onFarcasterUrlChange,
  onFetchDetails,
  fetching,
}: AppUrlsSectionProps) {
  const canFetch = url && url.startsWith("https://");

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
          <span>🌐</span> APP URLS
        </h3>
        <p className="text-xs text-white/50 mb-4">Where users can access your mini app</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="url" className="text-xs font-semibold text-white/80 flex items-center gap-1.5">
            <span>🌐</span> Main Website URL <span className="text-red-400">*</span>
          </Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <Input
                id="url"
                type="url"
                placeholder="Enter your main website URL..."
                value={url}
                onChange={(e) => onUrlChange(e.target.value)}
                className="pl-10 h-12 bg-[#0f0f15] border-transparent focus:border-purple-500/50 rounded-xl"
                disabled={fetching}
              />
            </div>
            <Button
              type="button"
              onClick={onFetchDetails}
              disabled={!canFetch || fetching}
              className="h-12 px-6 bg-base-blue hover:bg-base-blue/80 text-white rounded-xl font-semibold shadow-lg shadow-base-blue/30 transition-all"
            >
              {fetching ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Fetching...
                </>
              ) : (
                "Fetch Details"
              )}
            </Button>
          </div>
          <p className="text-xs text-white/40 mt-1.5">
            We will automatically fetch your application details from /.well-known/farcaster.json
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="baseMiniAppUrl" className="text-xs font-semibold text-white/80 flex items-center gap-1.5">
            <span>🔷</span> Base Mini App URL <span className="text-white/40 text-[10px]">(Optional)</span>
          </Label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <Input
              id="baseMiniAppUrl"
              type="url"
              placeholder="Enter Base mini app URL..."
              value={baseMiniAppUrl}
              onChange={(e) => onBaseMiniAppUrlChange(e.target.value)}
              className="pl-10 h-12 bg-[#0f0f15] border-transparent focus:border-purple-500/50 rounded-xl"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="farcasterUrl" className="text-xs font-semibold text-white/80 flex items-center gap-1.5">
            <span>🔵</span> Farcaster Mini App URL <span className="text-white/40 text-[10px]">(Optional)</span>
          </Label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <Input
              id="farcasterUrl"
              type="url"
              placeholder="Enter Farcaster mini app URL..."
              value={farcasterUrl}
              onChange={(e) => onFarcasterUrlChange(e.target.value)}
              className="pl-10 h-12 bg-[#0f0f15] border-transparent focus:border-purple-500/50 rounded-xl"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

