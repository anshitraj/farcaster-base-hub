"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Type } from "lucide-react";

interface AppDetailsSectionProps {
  name: string;
  onNameChange: (value: string) => void;
}

export default function AppDetailsSection({ name, onNameChange }: AppDetailsSectionProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
          <span>📱</span> APP DETAILS
        </h3>
        <p className="text-xs text-white/50 mb-4">Basic information about your mini app</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="name" className="text-xs font-semibold text-white/80 flex items-center gap-1.5">
          App Name <span className="text-red-400">*</span>
        </Label>
        <div className="relative">
          <Type className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <Input
            id="name"
            placeholder="Enter your app name..."
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            className="pl-10 h-12 bg-[#0f0f15] border-transparent focus:border-purple-500/50 rounded-xl"
          />
        </div>
      </div>
    </div>
  );
}

