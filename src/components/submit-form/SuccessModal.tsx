"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SuccessModalProps {
  open: boolean;
  onClose: () => void;
  isVerified: boolean;
  appId?: string;
}

export default function SuccessModal({ open, onClose, isVerified, appId }: SuccessModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#1a1f2e] border-white/10">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center border border-green-500/30">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl font-bold text-white">
            Your Mini App has been submitted!
          </DialogTitle>
          <DialogDescription className="text-center text-white/70 mt-2">
            {isVerified ? (
              <>
                <p className="text-green-400 font-semibold mb-2">✓ Verified Developer</p>
                <p>Your app has been automatically approved and is now live!</p>
              </>
            ) : (
              <p>Your app has been submitted for review. An admin will review it shortly.</p>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-3 mt-6">
          {appId && (
            <Button
              onClick={() => {
                window.location.href = `/apps/${appId}`;
              }}
              className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white"
            >
              View App
            </Button>
          )}
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1 border-white/10 hover:bg-white/10"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

