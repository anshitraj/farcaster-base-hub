"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Github, Twitter, Mail } from "lucide-react";

interface AdditionalMetadataSectionProps {
  githubUrl: string;
  twitterUrl: string;
  supportEmail: string;
  isOpenSource: boolean;
  onGithubUrlChange: (value: string) => void;
  onTwitterUrlChange: (value: string) => void;
  onSupportEmailChange: (value: string) => void;
  onIsOpenSourceChange: (value: boolean) => void;
}

export default function AdditionalMetadataSection({
  githubUrl,
  twitterUrl,
  supportEmail,
  isOpenSource,
  onGithubUrlChange,
  onTwitterUrlChange,
  onSupportEmailChange,
  onIsOpenSourceChange,
}: AdditionalMetadataSectionProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
          <span>📋</span> ADDITIONAL APP METADATA
        </h3>
        <p className="text-xs text-white/50 mb-4">Optional information to help users learn more</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="githubUrl" className="text-xs font-semibold text-white/80 flex items-center gap-1.5">
            <Github className="w-3 h-3" /> GitHub Repository URL <span className="text-white/40 text-[10px]">(Optional)</span>
          </Label>
          <Input
            id="githubUrl"
            type="url"
            placeholder="https://github.com/..."
            value={githubUrl}
            onChange={(e) => onGithubUrlChange(e.target.value)}
            className="h-12 bg-[#0f0f15] border-transparent focus:border-purple-500/50 rounded-xl"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="twitterUrl" className="text-xs font-semibold text-white/80 flex items-center gap-1.5">
            <Twitter className="w-3 h-3" /> Twitter / X Profile URL <span className="text-white/40 text-[10px]">(Optional)</span>
          </Label>
          <Input
            id="twitterUrl"
            type="url"
            placeholder="https://twitter.com/..."
            value={twitterUrl}
            onChange={(e) => onTwitterUrlChange(e.target.value)}
            className="h-12 bg-[#0f0f15] border-transparent focus:border-purple-500/50 rounded-xl"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="supportEmail" className="text-xs font-semibold text-white/80 flex items-center gap-1.5">
            <Mail className="w-3 h-3" /> Support Email <span className="text-white/40 text-[10px]">(Optional)</span>
          </Label>
          <Input
            id="supportEmail"
            type="email"
            placeholder="support@example.com"
            value={supportEmail}
            onChange={(e) => onSupportEmailChange(e.target.value)}
            className="h-12 bg-[#0f0f15] border-transparent focus:border-purple-500/50 rounded-xl"
          />
        </div>

        <div className="space-y-1.5 md:col-span-2">
          <div className="flex items-center justify-between p-4 rounded-xl bg-[#0f0f15] border border-white/10">
            <div>
              <Label htmlFor="isOpenSource" className="text-xs font-semibold text-white/80 flex items-center gap-1.5">
                Is App Open Source? <span className="text-white/40 text-[10px]">(Optional)</span>
              </Label>
              <p className="text-xs text-white/50 mt-1">Mark your app as open source</p>
            </div>
            <Switch
              id="isOpenSource"
              checked={isOpenSource}
              onCheckedChange={onIsOpenSourceChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

