"use client";

import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FileText } from "lucide-react";

interface DeveloperNotesSectionProps {
  notesToAdmin: string;
  onNotesToAdminChange: (value: string) => void;
}

export default function DeveloperNotesSection({
  notesToAdmin,
  onNotesToAdminChange,
}: DeveloperNotesSectionProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
          <span>📄</span> DEVELOPER NOTES
        </h3>
        <p className="text-xs text-white/50 mb-4">Additional information for reviewers</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notesToAdmin" className="text-xs font-semibold text-white/80 flex items-center gap-1.5">
          Notes for Review <span className="text-white/40 text-[10px]">(Optional)</span>
        </Label>
        <div className="relative">
          <FileText className="absolute left-3 top-3 w-4 h-4 text-white/40" />
          <Textarea
            id="notesToAdmin"
            placeholder="Explain your relationship to this app if wallet verification is not possible..."
            value={notesToAdmin}
            onChange={(e) => onNotesToAdminChange(e.target.value)}
            className="pl-10 min-h-[100px] bg-[#0f0f15] border-transparent focus:border-purple-500/50 rounded-xl resize-none"
          />
        </div>
      </div>
    </div>
  );
}

