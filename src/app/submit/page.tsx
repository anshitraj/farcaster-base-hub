"use client";

import SubmitForm from "@/components/SubmitForm";
import AppHeader from "@/components/AppHeader";
import { Sparkles } from "lucide-react";

export default function SubmitPage() {
  return (
    <div className="min-h-screen bg-[#0B0F19] pb-24">
      <AppHeader />
      <div className="pt-8 pb-8">
        <div className="max-w-screen-md mx-auto px-4">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-card mb-4">
              <Sparkles className="w-4 h-4 text-base-cyan" />
              <span className="text-xs text-muted-foreground">Join the ecosystem</span>
            </div>
            
            <h1 className="text-2xl md:text-3xl font-bold mb-2">
              <span className="text-gradient-base">Submit Your Mini App</span>
            </h1>
            
            <p className="text-muted-foreground text-sm max-w-xl mx-auto">
              Share your creation with the Farcaster and Base community. Get discovered by thousands of users.
            </p>
          </div>

          <SubmitForm />
        </div>
      </div>
    </div>
  );
}
