"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, Upload, X } from "lucide-react";
import { useRef } from "react";

interface ScreenshotsSectionProps {
  screenshots: string[];
  screenshotInput: string;
  onScreenshotInputChange: (value: string) => void;
  onAddScreenshot: () => void;
  onRemoveScreenshot: (index: number) => void;
  onUploadScreenshot: (file: File) => void;
  uploading: boolean;
}

export default function ScreenshotsSection({
  screenshots,
  screenshotInput,
  onScreenshotInputChange,
  onAddScreenshot,
  onRemoveScreenshot,
  onUploadScreenshot,
  uploading,
}: ScreenshotsSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
          <span>📸</span> SCREENSHOTS
        </h3>
        <p className="text-xs text-white/50 mb-4">Show users what your app looks like</p>
      </div>

      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <Input
              type="url"
              placeholder="Enter screenshot URL..."
              value={screenshotInput}
              onChange={(e) => onScreenshotInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && screenshotInput.trim()) {
                  e.preventDefault();
                  onAddScreenshot();
                }
              }}
              className="pl-10 h-12 bg-[#0f0f15] border-transparent focus:border-purple-500/50 rounded-xl"
            />
          </div>
          <Button
            type="button"
            onClick={onAddScreenshot}
            disabled={!screenshotInput.trim()}
            className="h-12 px-4 bg-purple-500 hover:bg-purple-600 text-white rounded-xl"
          >
            <ImageIcon className="w-4 h-4" />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUploadScreenshot(file);
            }}
            disabled={uploading}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="h-12 px-4 border-white/10 hover:bg-white/10 rounded-xl"
          >
            <Upload className="w-4 h-4 mr-2" />
            {uploading ? "..." : "Upload"}
          </Button>
        </div>

        {screenshots.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {screenshots.map((screenshot, index) => (
              <div key={index} className="relative group">
                <img
                  src={screenshot}
                  alt={`Screenshot ${index + 1}`}
                  className="w-full h-24 object-cover rounded-lg border border-white/10"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://via.placeholder.com/400x300?text=Invalid+Image";
                  }}
                />
                <button
                  type="button"
                  onClick={() => onRemoveScreenshot(index)}
                  className="absolute top-1 right-1 bg-red-500/80 hover:bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

